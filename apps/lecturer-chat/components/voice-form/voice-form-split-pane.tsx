"use client";

import { ResizableSplitPane } from "@/components/ui/resizable-split-pane";
import type { ReactNode } from "react";

const VOICE_STORAGE_KEY = "voice-form-main-split";
const VOICE_DEFAULT_RATIO = 0.48;
const VOICE_MIN_RATIO = 0.22;
const VOICE_MAX_RATIO = 0.78;
const VOICE_HANDLE_PX = 6;

interface VoiceFormSplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  className?: string;
}

export function VoiceFormSplitPane({ left, right, className }: VoiceFormSplitPaneProps) {
  return (
    <ResizableSplitPane
      left={left}
      right={right}
      className={className}
      storageKey={VOICE_STORAGE_KEY}
      defaultRatio={VOICE_DEFAULT_RATIO}
      minRatio={VOICE_MIN_RATIO}
      maxRatio={VOICE_MAX_RATIO}
      handleSize={VOICE_HANDLE_PX}
      handleAriaLabel="Kéo để chỉnh kích thước giữa hội thoại và điền mẫu"
    />
  );
}
