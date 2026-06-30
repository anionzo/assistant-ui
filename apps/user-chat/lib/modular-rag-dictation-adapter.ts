import { parseVoiceSse, type AudioChunk } from "@idx/voice-input";
import type { DictationAdapter } from "@assistant-ui/react";

const RECORDING_MIME_TYPE = "audio/webm;codecs=opus";

export type ModularRagDictationAdapterOptions = {
  api?: string;
  getConversationId: () => string;
  corpusId?: string;
  pipeline?: string;
  onAudioChunk?: (chunk: AudioChunk) => void;
  onError?: (error: Error) => void;
};

export class ModularRagDictationAdapter implements DictationAdapter {
  private readonly options: Required<
    Pick<ModularRagDictationAdapterOptions, "api" | "getConversationId">
  > &
    Omit<ModularRagDictationAdapterOptions, "api" | "getConversationId">;

  constructor(options: ModularRagDictationAdapterOptions) {
    this.options = {
      api: "/api/voice/stream",
      ...options,
    };
  }

  static isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia)
    );
  }

  listen(): DictationAdapter.Session {
    const speechStartCallbacks = new Set<() => void>();
    const speechEndCallbacks = new Set<(result: DictationAdapter.Result) => void>();
    const speechCallbacks = new Set<(result: DictationAdapter.Result) => void>();

    let mediaRecorder: MediaRecorder | null = null;
    let mediaStream: MediaStream | null = null;
    let chunks: Blob[] = [];
    let cancelled = false;
    let finalTranscript = "";

    const session: DictationAdapter.Session = {
      status: { type: "starting" },

      stop: async () => {
        if (cancelled) return;

        const recorder = mediaRecorder;
        if (!recorder || recorder.state === "inactive") {
          session.status = { type: "ended", reason: "stopped" };
          for (const callback of speechEndCallbacks) {
            callback({ transcript: finalTranscript, isFinal: true });
          }
          return;
        }

        await new Promise<void>((resolve) => {
          recorder.onstop = async () => {
            mediaStream?.getTracks().forEach((track) => track.stop());
            mediaStream = null;
            mediaRecorder = null;

            const blob = new Blob(chunks, { type: RECORDING_MIME_TYPE });
            chunks = [];

            for (const callback of speechCallbacks) {
              callback({ transcript: "Đang xử lý...", isFinal: false });
            }

            try {
              const form = new FormData();
              form.append("audio", blob, "recording.webm");
              form.append("conversation_id", this.options.getConversationId());
              if (this.options.corpusId) form.append("corpus_id", this.options.corpusId);
              if (this.options.pipeline) form.append("pipeline", this.options.pipeline);

              const response = await fetch(this.options.api, {
                method: "POST",
                body: form,
              });

              if (!response.ok) {
                const payload = (await response.json().catch(() => ({}))) as Record<
                  string,
                  unknown
                >;
                throw new Error(
                  typeof payload.error === "string"
                    ? payload.error
                    : `Voice request failed (${response.status})`,
                );
              }

              if (!response.body) throw new Error("Voice stream returned no body");

              for await (const event of parseVoiceSse(response.body)) {
                if (cancelled) break;

                switch (event.type) {
                  case "transcript":
                    finalTranscript = event.text;
                    for (const callback of speechCallbacks) {
                      callback({ transcript: event.text, isFinal: true });
                    }
                    break;
                  case "audio_chunk":
                    this.options.onAudioChunk?.(event.chunk);
                    break;
                  case "error": {
                    const error = new Error(event.message);
                    this.options.onError?.(error);
                    session.status = { type: "ended", reason: "error" };
                    throw error;
                  }
                }
              }

              session.status = { type: "ended", reason: "stopped" };
              for (const callback of speechEndCallbacks) {
                callback({ transcript: finalTranscript, isFinal: true });
              }
            } catch (error) {
              if (cancelled) return;
              const message =
                error instanceof Error ? error.message : "Voice processing failed";
              const voiceError = new Error(message);
              this.options.onError?.(voiceError);
              session.status = { type: "ended", reason: "error" };
              for (const callback of speechEndCallbacks) {
                callback({ transcript: finalTranscript, isFinal: true });
              }
            } finally {
              resolve();
            }
          };

          recorder.stop();
        });
      },

      cancel: () => {
        cancelled = true;
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
        mediaStream?.getTracks().forEach((track) => track.stop());
        mediaStream = null;
        mediaRecorder = null;
        chunks = [];
        session.status = { type: "ended", reason: "cancelled" };
      },

      onSpeechStart: (callback) => {
        speechStartCallbacks.add(callback);
        return () => speechStartCallbacks.delete(callback);
      },

      onSpeechEnd: (callback) => {
        speechEndCallbacks.add(callback);
        return () => speechEndCallbacks.delete(callback);
      },

      onSpeech: (callback) => {
        speechCallbacks.add(callback);
        return () => speechCallbacks.delete(callback);
      },
    };

    void this.startRecording(session, speechStartCallbacks, {
      setRecorder: (recorder) => {
        mediaRecorder = recorder;
      },
      setStream: (stream) => {
        mediaStream = stream;
      },
      pushChunk: (chunk) => {
        chunks.push(chunk);
      },
    });

    return session;
  }

  private async startRecording(
    session: DictationAdapter.Session,
    speechStartCallbacks: Set<() => void>,
    refs: {
      setRecorder: (recorder: MediaRecorder) => void;
      setStream: (stream: MediaStream) => void;
      pushChunk: (chunk: Blob) => void;
    },
  ) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      refs.setStream(stream);

      const recorder = new MediaRecorder(stream, { mimeType: RECORDING_MIME_TYPE });
      refs.setRecorder(recorder);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) refs.pushChunk(event.data);
      };

      recorder.onstart = () => {
        session.status = { type: "running" };
        for (const callback of speechStartCallbacks) callback();
      };

      recorder.onerror = () => {
        session.status = { type: "ended", reason: "error" };
      };

      recorder.start();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to access microphone";
      const voiceError = new Error(message);
      this.options.onError?.(voiceError);
      session.status = { type: "ended", reason: "error" };
    }
  }
}