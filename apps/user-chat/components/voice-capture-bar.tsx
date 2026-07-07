"use client";

import { ComposerPlusMenu } from "@/components/form-module/composer-plus-menu";
import {
  createIdleWaveformLevels,
  DICTATION_IDLE_LEVEL,
  DICTATION_WAVE_BARS,
} from "@/lib/voice-dictation-capture";
import { cn } from "@/lib/utils";
import { Check, Pause, Play, X } from "lucide-react";
import { type FC, type ReactNode } from "react";
import type { DictationCaptureState } from "@/lib/voice-dictation-capture";

function CaptureIconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="text-foreground/75 hover:bg-muted/50 inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function VoiceWaveform({
  levels,
  paused,
}: {
  levels: number[];
  paused: boolean;
}) {
  return (
    <div
      className="aui-voice-capture-waveform flex h-6 min-h-6 min-w-0 flex-1 items-center justify-between gap-[2px] overflow-hidden px-1"
      aria-hidden
    >
      {levels.map((level, i) => {
        const idle = level <= DICTATION_IDLE_LEVEL + 0.02;
        const dotHeight = idle ? 3 : Math.max(4, Math.min(24, Math.round(level * 28)));
        return (
          <span key={i} className="flex max-w-[4px] min-w-0 flex-1 justify-center">
            <span
              className="block rounded-full bg-neutral-400/75 dark:bg-neutral-500/80"
              style={{
                width: 3,
                height: dotHeight,
                opacity: paused ? 0.35 : idle ? 0.5 : 0.55 + level * 0.4,
                transition: paused ? "height 120ms ease-out, opacity 120ms" : "height 35ms linear",
              }}
            />
          </span>
        );
      })}
    </div>
  );
}

export type VoiceCaptureBarProps = {
  state: DictationCaptureState;
  levels: number[];
  paused: boolean;
  initialAuth: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onTogglePause: () => void;
};

export const VoiceCaptureBar: FC<VoiceCaptureBarProps> = ({
  state,
  levels,
  paused,
  initialAuth,
  busy,
  onConfirm,
  onCancel,
  onTogglePause,
}) => {
  const recording = state === "recording";
  const processing = state === "processing";
  const canPause = recording;
  const canConfirm = recording && !paused;
  const canCancel = recording || processing;
  const waveformLevels =
    levels.length === DICTATION_WAVE_BARS
      ? levels
      : createIdleWaveformLevels(DICTATION_WAVE_BARS);

  return (
    <div
      className={cn(
        "aui-voice-capture-bar flex w-full min-w-0 items-center gap-1 rounded-full border border-border/50 bg-background px-2 py-2",
        "shadow-[0_2px_14px_-6px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.06)]",
      )}
    >
      <ComposerPlusMenu formPickerDisabled={!initialAuth} variant="capture" />
      <VoiceWaveform levels={waveformLevels} paused={paused} />
      <div className="flex shrink-0 items-center gap-0.5 ps-0.5">
        <CaptureIconButton
          label={paused ? "Tiếp tục ghi âm" : "Tạm dừng"}
          disabled={!canPause}
          onClick={onTogglePause}
        >
          {paused ? <Play className="size-[18px] stroke-[2px]" /> : <Pause className="size-[18px] stroke-[2px]" />}
        </CaptureIconButton>
        <CaptureIconButton label="Hủy ghi âm" disabled={!canCancel || busy} onClick={onCancel}>
          <X className="size-[18px] stroke-[2px]" />
        </CaptureIconButton>
        <CaptureIconButton
          label="Hoàn thành ghi âm"
          disabled={!canConfirm || busy}
          onClick={onConfirm}
        >
          <Check className="size-[18px] stroke-[2.5px]" />
        </CaptureIconButton>
      </div>
    </div>
  );
};