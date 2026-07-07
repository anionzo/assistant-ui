"use client";

import { TooltipIconButton } from "@/components/tooltip-icon-button";
import { useActiveConversationId } from "@/lib/active-conversation-context";
import { extractAssistantText, processFormFillTurn } from "@/lib/form-module/process-form-fill-turn";
import { useFormModuleStore, useFormModuleStoreApi } from "@/lib/form-module/form-module-store";
import { buildAssistantMetadata, extractVoiceAnswer } from "@/lib/voice-turn";
import { useVoicePlaybackEnqueueRef } from "@/lib/voice-playback-provider";
import { postFill } from "@/lib/voice-form/api";
import { VoiceFormRecorder } from "@/lib/voice-form/recorder";
import { useAui, AuiIf, ComposerPrimitive } from "@assistant-ui/react";
import { useT } from "@idx/i18n";
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
  useState,
  type ReactNode,
} from "react";

const VOICE_BUSY_STATES: VoiceState[] = [
  "recording",
  "uploading",
  "processing",
  "playing",
];

const PHASE_KEYS: Partial<Record<VoiceState, string>> = {
  recording: "voice.recording",
  uploading: "voice.uploading",
  processing: "voice.processing",
  playing: "voice.playing",
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
  const formRecorderRef = useRef(new VoiceFormRecorder());

  const store = useFormModuleStoreApi();
  const mode = useFormModuleStore((s) => s.mode);
  const binding = useFormModuleStore((s) => s.binding);
  const fieldValues = useFormModuleStore((s) => s.fieldValues);
  const [formMicState, setFormMicState] = useState<VoiceState>("idle");

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

  const { state: ragState, startRecording: ragStart, stopRecording: ragStop } = useVoiceSession({
    api: "/api/voice/stream",
    conversationId: getConversationId(),
    onTranscript: handleTranscript,
    onAudioChunk: (chunk) => enqueueRef.current(chunk),
    onMetadata: handleMetadata,
  });

  const startRecording = useCallback(async () => {
    if (mode === "form-fill" && binding) {
      try {
        await formRecorderRef.current.start();
        setFormMicState("recording");
      } catch {
        setFormMicState("idle");
      }
      return;
    }
    ragStart();
  }, [mode, binding, ragStart]);

  const stopRecording = useCallback(async () => {
    if (mode === "form-fill" && binding) {
      if (formMicState !== "recording") return;
      setFormMicState("processing");
      store.setBusy(true);
      try {
        const blob = await formRecorderRef.current.stop();
        if (!blob) {
          setFormMicState("idle");
          store.setBusy(false);
          return;
        }
        const response = await postFill(binding.formSessionId, {
          audio: blob,
          form_code: binding.formCode,
          field_values: JSON.stringify(fieldValues),
          history: JSON.stringify([]),
        });
        const transcript = (response.transcript || "").trim();
        if (transcript) {
          aui.thread().append({
            role: "user",
            content: [{ type: "text", text: transcript }],
            startRun: false,
          });
        }
        await processFormFillTurn({ store, binding, response });
        const assistantText = extractAssistantText(response);
        if (assistantText) {
          aui.thread().append({
            role: "assistant",
            content: [{ type: "text", text: assistantText }],
            startRun: false,
          });
        }
      } catch {
        /* ignore */
      } finally {
        store.setBusy(false);
        setFormMicState("idle");
      }
      return;
    }
    ragStop();
  }, [mode, binding, fieldValues, formMicState, store, aui, ragStop]);

  const state: VoiceState = mode === "form-fill" && formMicState !== "idle" ? formMicState : ragState;

  const value: VoiceComposerContextValue = {
    state,
    isVoiceBusy: VOICE_BUSY_STATES.includes(state),
    startRecording: () => void startRecording(),
    stopRecording: () => void stopRecording(),
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
  const t = useT();
  const { state } = useVoiceComposerContext();
  const key = PHASE_KEYS[state];
  const label = key ? t(key) : null;
  if (!label) return null;

  return (
    <span className="text-muted-foreground text-xs" aria-live="polite">
      {label}
    </span>
  );
}

export function VoiceComposerSendControls() {
  const t = useT();
  const { isVoiceBusy } = useVoiceComposerContext();

  return (
    <>
      <VoicePhaseLabel />
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send
          disabled={isVoiceBusy}
          render={
            <TooltipIconButton
              tooltip={t("voice.sendMessage")}
              side="bottom"
              type="button"
              variant="default"
              size="icon"
              className="aui-composer-send size-7 rounded-full"
              aria-label={t("voice.sendMessage")}
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
              tooltip={t("voice.stopGenerating")}
              side="bottom"
              type="button"
              variant="default"
              size="icon"
              className="aui-composer-cancel size-7 rounded-full"
              aria-label={t("voice.stopGenerating")}
            />
          }
        >
          <SquareIcon className="aui-composer-cancel-icon size-3.5 fill-current" />
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </>
  );
}