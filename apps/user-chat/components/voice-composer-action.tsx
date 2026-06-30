"use client";

import { TooltipIconButton } from "@/components/tooltip-icon-button";
import { useActiveConversationId } from "@/lib/active-conversation-context";
import { buildAssistantMetadata, extractVoiceAnswer } from "@/lib/voice-turn";
import { useVoicePlaybackEnqueueRef } from "@/lib/voice-playback-provider";
import { useAui, AuiIf, ComposerPrimitive } from "@assistant-ui/react";
import {
  useVoiceSession,
  VoiceMicButton,
  type VoiceMetadata,
  type VoiceState,
} from "@idx/voice-input";
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from "react";

const VOICE_BUSY_STATES: VoiceState[] = [
  "recording",
  "uploading",
  "processing",
  "playing",
];

const PHASE_LABELS: Partial<Record<VoiceState, string>> = {
  recording: "Đang ghi âm...",
  uploading: "Đang tải lên...",
  processing: "Đang xử lý...",
  playing: "Đang phát...",
};

type VoiceComposerContextValue = {
  state: VoiceState;
  isVoiceBusy: boolean;
  startRecording: () => void;
  stopRecording: () => void;
};

const VoiceComposerContext = createContext<VoiceComposerContextValue | null>(null);

function useVoiceComposerContext() {
  const context = useContext(VoiceComposerContext);
  if (!context) {
    throw new Error("Voice composer controls must be used within VoiceComposerProvider");
  }
  return context;
}

export function VoiceComposerProvider({ children }: { children: ReactNode }) {
  const aui = useAui();
  const getConversationId = useActiveConversationId();
  const enqueueRef = useVoicePlaybackEnqueueRef();
  const transcriptRef = useRef("");

  const handleTranscript = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      transcriptRef.current = trimmed;
      aui.thread().append({
        role: "user",
        content: [{ type: "text", text: trimmed }],
        startRun: false,
      });
    },
    [aui],
  );

  const handleMetadata = useCallback(
    (metadata: VoiceMetadata) => {
      const answer = extractVoiceAnswer(metadata) || transcriptRef.current;
      if (!answer) return;

      const assistantMetadata = buildAssistantMetadata(metadata);
      aui.thread().append({
        role: "assistant",
        content: [{ type: "text", text: answer }],
        ...(assistantMetadata ? { metadata: assistantMetadata } : {}),
      });
      transcriptRef.current = "";
    },
    [aui],
  );

  const { state, startRecording, stopRecording } = useVoiceSession({
    api: "/api/voice/stream",
    conversationId: getConversationId(),
    onTranscript: handleTranscript,
    onAudioChunk: (chunk) => enqueueRef.current(chunk),
    onMetadata: handleMetadata,
  });

  const value: VoiceComposerContextValue = {
    state,
    isVoiceBusy: VOICE_BUSY_STATES.includes(state),
    startRecording,
    stopRecording,
  };

  return (
    <VoiceComposerContext.Provider value={value}>
      {children}
    </VoiceComposerContext.Provider>
  );
}

export function VoiceMicControl() {
  const { state, startRecording, stopRecording } = useVoiceComposerContext();

  return (
    <VoiceMicButton
      state={state}
      onStart={startRecording}
      onStop={stopRecording}
      disabled={state === "uploading" || state === "processing" || state === "playing"}
      className="aui-composer-voice-mic"
    />
  );
}

export function VoicePhaseLabel() {
  const { state } = useVoiceComposerContext();
  const label = PHASE_LABELS[state];
  if (!label) return null;

  return (
    <span className="text-muted-foreground text-xs" aria-live="polite">
      {label}
    </span>
  );
}

export function VoiceComposerSendControls() {
  const { isVoiceBusy } = useVoiceComposerContext();

  return (
    <>
      <VoicePhaseLabel />
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send
          disabled={isVoiceBusy}
          render={
            <TooltipIconButton
              tooltip="Send message"
              side="bottom"
              type="button"
              variant="default"
              size="icon"
              className="aui-composer-send size-7 rounded-full"
              aria-label="Send message"
            />
          }
        >
          <ArrowUpIcon className="aui-composer-send-icon size-4.5" />
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel
          render={
            <TooltipIconButton
              tooltip="Stop generating"
              side="bottom"
              type="button"
              variant="default"
              size="icon"
              className="aui-composer-cancel size-7 rounded-full"
              aria-label="Stop generating"
            />
          }
        >
          <SquareIcon className="aui-composer-cancel-icon size-3.5 fill-current" />
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </>
  );
}