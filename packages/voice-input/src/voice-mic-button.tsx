"use client";

import type { FC } from "react";
import type { VoiceState } from "./types";

export type VoiceMicButtonProps = {
  state: VoiceState;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
  className?: string;
};

const stateLabels: Record<VoiceState, string> = {
  idle: "Nhấn để nói",
  recording: "Đang ghi âm...",
  uploading: "Đang tải lên...",
  processing: "Đang xử lý...",
  playing: "Đang phát...",
  error: "Thử lại",
};

export const VoiceMicButton: FC<VoiceMicButtonProps> = ({
  state,
  onStart,
  onStop,
  disabled,
  className = "",
}) => {
  const isActive = state === "recording" || state === "uploading" || state === "processing";

  const handlePointerDown = () => {
    if (state === "idle" || state === "error") onStart();
  };

  const handlePointerUp = () => {
    if (state === "recording") onStop();
  };

  const handlePointerLeave = () => {
    if (state === "recording") onStop();
  };

  const canInteract = !disabled && (state === "idle" || state === "recording" || state === "error");

  return (
    <button
      type="button"
      onPointerDown={canInteract ? handlePointerDown : undefined}
      onPointerUp={canInteract ? handlePointerUp : undefined}
      onPointerLeave={canInteract ? handlePointerLeave : undefined}
      disabled={disabled}
      aria-label={stateLabels[state]}
      className={`inline-flex size-7 items-center justify-center rounded-full transition-colors ${
        state === "recording"
          ? "bg-destructive text-destructive-foreground animate-pulse"
          : state === "error"
            ? "text-destructive hover:bg-muted"
            : "text-muted-foreground hover:bg-muted"
      } ${isActive ? "cursor-default" : "cursor-pointer"} ${className}`}
    >
      <MicIcon active={isActive} />
    </button>
  );
};

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? "animate-pulse" : ""}
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}
