"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseVoiceSse } from "./sse-voice-parser";
import type { AudioChunk, VoiceSessionOptions, VoiceState } from "./types";

const RECORDING_MIME_TYPE = "audio/webm;codecs=opus";

async function emitAudioChunk(
  chunk: AudioChunk,
  resolveAudioRef: VoiceSessionOptions["resolveAudioRef"],
  onAudioChunk?: (chunk: AudioChunk) => void,
) {
  if (chunk.data) {
    onAudioChunk?.(chunk);
    return;
  }
  if (!chunk.ref || !resolveAudioRef) return;
  const resolved = await resolveAudioRef(chunk.ref);
  if (resolved?.data) onAudioChunk?.(resolved);
}

export function useVoiceSession(options: VoiceSessionOptions) {
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<Error | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const discardRef = useRef(false);
  const hadInlineAudioRef = useRef(false);

  const cleanup = useCallback((stopTracks = true) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    if (stopTracks && mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    chunksRef.current = [];
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    discardRef.current = false;
    hadInlineAudioRef.current = false;
    setError(null);
    setState("recording");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: RECORDING_MIME_TYPE });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to access microphone";
      setError(new Error(message));
      setState("error");
    }
  }, []);

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") recorder.pause();
  }, []);

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "paused") recorder.resume();
  }, []);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    setState("uploading");

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        if (discardRef.current) {
          discardRef.current = false;
          setState("idle");
          resolve();
          return;
        }

        const blob = new Blob(chunksRef.current, { type: RECORDING_MIME_TYPE });
        chunksRef.current = [];
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;

        try {
          const { api, conversationId, corpusId, pipeline, resolveAudioRef } = optionsRef.current;
          const form = new FormData();
          form.append("audio", blob, "recording.webm");
          form.append("conversation_id", conversationId);
          if (corpusId) form.append("corpus_id", corpusId);
          if (pipeline) form.append("pipeline", pipeline);

          const abort = new AbortController();
          abortRef.current = abort;

          setState("processing");
          hadInlineAudioRef.current = false;

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
                if (event.chunk.data) hadInlineAudioRef.current = true;
                await emitAudioChunk(event.chunk, resolveAudioRef, onAudioChunk);
                break;
              case "metadata": {
                onMetadata?.(event.metadata);
                const refs = event.metadata.audio_refs;
                if (!hadInlineAudioRef.current && refs?.length && resolveAudioRef) {
                  for (const ref of refs) {
                    setState("playing");
                    await emitAudioChunk({ ref }, resolveAudioRef, onAudioChunk);
                  }
                }
                break;
              }
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

          setState((current) => (current === "processing" || current === "playing" ? "idle" : current));
        } catch (err) {
          if ((err as Error)?.name === "AbortError") {
            setState("idle");
            return;
          }
          const message = err instanceof Error ? err.message : "Voice processing failed";
          const voiceError = new Error(message);
          optionsRef.current.onError?.(voiceError);
          setError(voiceError);
          setState("error");
        } finally {
          abortRef.current = null;
        }

        resolve();
      };

      recorder.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    discardRef.current = true;
    cleanup();
    setState("idle");
    setError(null);
  }, [cleanup]);

  return {
    state,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancel,
  };
}