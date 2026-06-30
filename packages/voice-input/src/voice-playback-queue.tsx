"use client";

import { useEffect, useRef, useState, type FC } from "react";
import type { AudioChunk } from "./types";

export type VoicePlaybackQueueProps = {
  chunks: AudioChunk[];
  onComplete?: () => void;
};

export const VoicePlaybackQueue: FC<VoicePlaybackQueueProps> = ({ chunks, onComplete }) => {
  const [playingIndex, setPlayingIndex] = useState<number>(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<AudioChunk[]>([]);
  const indexRef = useRef(0);

  useEffect(() => {
    if (chunks.length === 0) return;
    queueRef.current = chunks;
    indexRef.current = 0;
    playNext();
  }, [chunks]);

  function playNext() {
    const idx = indexRef.current;
    if (idx >= queueRef.current.length) {
      setPlayingIndex(-1);
      onComplete?.();
      return;
    }

    const chunk = queueRef.current[idx];
    setPlayingIndex(idx);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      const binary = atob(chunk.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const blob = new Blob([bytes], { type: chunk.format || "audio/webm" });
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        indexRef.current++;
        playNext();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        indexRef.current++;
        playNext();
      };

      audio.play().catch(() => {
        URL.revokeObjectURL(url);
        indexRef.current++;
        playNext();
      });
    } catch {
      indexRef.current++;
      playNext();
    }
  }

  if (playingIndex < 0) return null;

  return (
    <span className="text-muted-foreground text-xs" aria-live="polite">
      Đang phát {playingIndex + 1}/{queueRef.current.length}
    </span>
  );
};
