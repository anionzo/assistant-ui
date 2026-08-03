"use client";

import { VoicePlaybackQueue, type AudioChunk } from "@idx/voice-input";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";

type VoicePlaybackContextValue = {
  enqueueChunk: (chunk: AudioChunk) => void;
};

const VoicePlaybackContext = createContext<VoicePlaybackContextValue | null>(null);

export function useVoicePlaybackEnqueueRef(): MutableRefObject<
  (chunk: AudioChunk) => void
> {
  const context = useContext(VoicePlaybackContext);
  const fallbackRef = useRef<(chunk: AudioChunk) => void>(() => {});
  const contextRef = useRef<(chunk: AudioChunk) => void>(() => {});

  if (context) {
    contextRef.current = context.enqueueChunk;
    return contextRef;
  }

  return fallbackRef;
}

export function VoicePlaybackProvider({ children }: { children: ReactNode }) {
  const [chunks, setChunks] = useState<AudioChunk[]>([]);

  const enqueueChunk = useCallback((chunk: AudioChunk) => {
    setChunks((current) => [...current, chunk]);
  }, []);

  const handleComplete = useCallback(() => {
    setChunks([]);
  }, []);

  return (
    <VoicePlaybackContext.Provider value={{ enqueueChunk }}>
      {children}
      <VoicePlaybackQueue chunks={chunks} onComplete={handleComplete} />
    </VoicePlaybackContext.Provider>
  );
}