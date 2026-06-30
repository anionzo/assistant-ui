"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseVoiceSse } from "./sse-voice-parser";
import type { VoiceSessionOptions, VoiceState } from "./types";

const RECORDING_MIME_TYPE = "audio/webm;codecs=opus";

export function useVoiceSession(options: VoiceSessionOptions) {
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<Error | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    setError(null);
    setState("recording");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: RECORDING_MIME_TYPE });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to access microphone";
      setError(new Error(message));
      setState("error");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    setState("uploading");

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: RECORDING_MIME_TYPE });
        chunksRef.current = [];

        try {
          const { api, conversationId, corpusId, pipeline } = optionsRef.current;
          const form = new FormData();
          form.append("audio", blob, "recording.webm");
          form.append("conversation_id", conversationId);
          if (corpusId) form.append("corpus_id", corpusId);
          if (pipeline) form.append("pipeline", pipeline);

          const abort = new AbortController();
          abortRef.current = abort;

          setState("processing");

          const response = await fetch(api, {
            method: "POST",
            body: form,
            signal: abort.signal,
          });

          if (!response.ok) {
            const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
            throw new Error(
              typeof payload.error === "string" ? payload.error : `Voice request failed (${response.status})`,
            );
          }

          if (!response.body) throw new Error("Voice stream returned no body");

          const { onTranscript, onAudioChunk, onMetadata, onError, onDone } = optionsRef.current;

          for await (const event of parseVoiceSse(response.body)) {
            switch (event.type) {
              case "transcript":
                onTranscript?.(event.text);
                break;
              case "audio_chunk":
                setState("playing");
                onAudioChunk?.(event.chunk);
                break;
              case "metadata":
                onMetadata?.(event.metadata);
                break;
              case "done":
                onDone?.();
                setState("idle");
                break;
              case "error": {
                const err = new Error(event.message);
                onError?.(err);
                setError(err);
                setState("error");
                break;
              }
            }
          }

          if (state === "processing" || state === "playing") {
            setState("idle");
          }
        } catch (err) {
          if ((err as Error)?.name === "AbortError") {
            setState("idle");
            return;
          }
          const message = err instanceof Error ? err.message : "Voice processing failed";
          const error = new Error(message);
          optionsRef.current.onError?.(error);
          setError(error);
          setState("error");
        } finally {
          abortRef.current = null;
        }

        resolve();
      };

      recorder.stop();
    });
  }, [state]);

  const cancel = useCallback(() => {
    cleanup();
    setState("idle");
    setError(null);
  }, [cleanup]);

  return { state, error, startRecording, stopRecording, cancel };
}
