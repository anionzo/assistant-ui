"use client";

import { VoiceCaptureBar } from "@/components/voice-capture-bar";
import { ComposerPlusMenu } from "@/components/form-module/composer-plus-menu";
import { TooltipIconButton } from "@/components/tooltip-icon-button";
import { useActiveConversationId } from "@/lib/active-conversation-context";
import { extractAssistantText, processFormFillTurn } from "@/lib/form-module/process-form-fill-turn";
import { useFormModuleStore, useFormModuleStoreApi } from "@/lib/form-module/form-module-store";
import { FORM_MODULE_ENABLED, FORM_FILL_VIA_CHAT_ENABLED } from "@/lib/feature-flags";
import {
  createIdleWaveformLevels,
  DictationWaveformScroller,
  DICTATION_WAVE_BARS,
  transcribeVoiceBlob,
  VoiceDictationCapture,
  type DictationCaptureState,
} from "@/lib/voice-dictation-capture";
import { buildAssistantMetadata, extractVoiceAnswer } from "@/lib/voice-turn";
import { useVoicePlaybackEnqueueRef } from "@/lib/voice-playback-provider";
import { postFill } from "@/lib/voice-form/api";
import { VoiceFormRecorder } from "@/lib/voice-form/recorder";
import { useAui, AuiIf, ComposerPrimitive } from "@assistant-ui/react";
import { useT } from "@idx/i18n";
import {
  useVoiceSession,
  type AudioChunk,
  type VoiceMetadata,
  type VoiceState,
} from "@idx/voice-input";
import { ArrowUpIcon, AudioLines, Mic, SquareIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

/** Tạm khóa đàm thoại trực tiếp — bật lại khi BE/UX sẵn sàng. */
const LIVE_CONVERSATION_ENABLED = false;

const PHASE_KEYS: Partial<Record<VoiceState, string>> = {
  recording: "voice.recording",
  uploading: "voice.uploading",
  processing: "voice.processing",
  playing: "voice.playing",
};

type VoiceComposerContextValue = {
  dictationOpen: boolean;
  dictationState: DictationCaptureState;
  dictationLevels: number[];
  dictationPaused: boolean;
  liveVoiceState: VoiceState;
  isLiveVoiceBusy: boolean;
  openDictationCapture: () => void;
  confirmDictation: () => void;
  cancelDictation: () => void;
  toggleDictationPause: () => void;
  startLiveVoice: () => void;
  stopLiveVoice: () => void;
};

const VoiceComposerContext = createContext<VoiceComposerContextValue | null>(null);

function useVoiceComposerContext() {
  const context = useContext(VoiceComposerContext);
  if (!context) {
    throw new Error("Voice composer controls must be used within VoiceComposerProvider");
  }
  return context;
}

async function resolveVoiceAudioRef(ref: string): Promise<AudioChunk | null> {
  const response = await fetch(`/api/voice/audio?ref=${encodeURIComponent(ref)}`);
  if (!response.ok) return null;
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return {
    data: btoa(binary),
    format: response.headers.get("Content-Type") ?? undefined,
  };
}

export function VoiceComposerProvider({ children }: { children: ReactNode }) {
  const aui = useAui();
  const getConversationId = useActiveConversationId();
  const enqueueRef = useVoicePlaybackEnqueueRef();
  const transcriptRef = useRef("");
  const formRecorderRef = useRef(new VoiceFormRecorder());
  const dictationRef = useRef(new VoiceDictationCapture());
  const waveformScrollerRef = useRef(new DictationWaveformScroller(DICTATION_WAVE_BARS));

  const store = useFormModuleStoreApi();
  const mode = useFormModuleStore((s) => s.mode);
  const binding = useFormModuleStore((s) => s.binding);
  const fieldValues = useFormModuleStore((s) => s.fieldValues);

  const [formMicState, setFormMicState] = useState<VoiceState>("idle");
  const [dictationOpen, setDictationOpen] = useState(false);
  const [dictationState, setDictationState] = useState<DictationCaptureState>("idle");
  const [dictationPaused, setDictationPaused] = useState(false);
  const [dictationLevels, setDictationLevels] = useState<number[]>(() =>
    createIdleWaveformLevels(DICTATION_WAVE_BARS),
  );

  const handleLiveTranscript = useCallback(
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

  const handleLiveMetadata = useCallback(
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

  const {
    state: liveVoiceState,
    startRecording: liveStart,
    stopRecording: liveStop,
  } = useVoiceSession({
    api: "/api/voice/stream",
    conversationId: getConversationId(),
    onTranscript: handleLiveTranscript,
    onAudioChunk: (chunk) => enqueueRef.current(chunk),
    onMetadata: handleLiveMetadata,
    resolveAudioRef: resolveVoiceAudioRef,
  });

  const closeDictation = useCallback(() => {
    setDictationOpen(false);
    setDictationState("idle");
    setDictationPaused(false);
    waveformScrollerRef.current.reset();
    setDictationLevels(createIdleWaveformLevels(DICTATION_WAVE_BARS));
  }, []);

  const openDictationCapture = useCallback(async () => {
    if (dictationOpen || dictationState === "processing") return;

    // Tách: mic dictation luôn normal (dùng dictationRef), không special form audio start.
    // Giữ formRecorder code cho reference.
    /*
    if (FORM_MODULE_ENABLED && FORM_FILL_VIA_CHAT_ENABLED && mode === "form-fill" && binding) {
      setDictationOpen(true);
      setDictationState("recording");
      try {
        await formRecorderRef.current.start();
      } catch {
        closeDictation();
      }
      return;
    }
    */

    setDictationOpen(true);
    setDictationState("recording");
    setDictationPaused(false);
    waveformScrollerRef.current.reset();
    setDictationLevels(createIdleWaveformLevels(DICTATION_WAVE_BARS));
    try {
      await dictationRef.current.start();
    } catch {
      dictationRef.current.cancel();
      closeDictation();
    }
  }, [dictationOpen, dictationState, closeDictation]);

  const cancelDictation = useCallback(() => {
    // Luôn normal cancel.
    /*
    if (FORM_MODULE_ENABLED && FORM_FILL_VIA_CHAT_ENABLED && mode === "form-fill" && binding) {
      void formRecorderRef.current.stop();
      setFormMicState("idle");
    } else {
      dictationRef.current.cancel();
    }
    */
    dictationRef.current.cancel();
    closeDictation();
  }, [closeDictation]);

  const applyDictationText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const current = aui.composer().getState().text;
      const next = current.trim() ? `${current.trimEnd()} ${trimmed}` : trimmed;
      aui.composer().setText(next);
    },
    [aui],
  );

  const confirmDictation = useCallback(async () => {
    if (dictationState !== "recording") return;
    setDictationState("processing");

    try {
      // Tách voice dictation: luôn chỉ transcribe và nhẩy text vào input box (như normal dictation/đàm thoại).
      // Không auto postFill hay fill form từ mic confirm, ngay cả khi form open.
      // User bấm gửi thủ công sau sẽ trigger form-fill (nếu mode active) qua router.
      // Giữ code form audio branch bên dưới cho reference/future (khi cần direct voice fill).
      /*
      if (FORM_MODULE_ENABLED && FORM_FILL_VIA_CHAT_ENABLED && mode === "form-fill" && binding) {
        setFormMicState("processing");
        store.setBusy(true);
        const blob = await formRecorderRef.current.stop();
        if (!blob) return;
        const response = await postFill(binding.formSessionId, {
          audio: blob,
          form_code: binding.formCode,
          field_values: JSON.stringify(fieldValues),
          history: JSON.stringify([]),
        });
        const transcript = (response.transcript || "").trim();
        if (transcript) applyDictationText(transcript);
        await processFormFillTurn({ store, binding, response });
        const assistantText = extractAssistantText(response);
        if (assistantText) {
          aui.thread().append({
            role: "assistant",
            content: [{ type: "text", text: assistantText }],
            startRun: false,
          });
        }
        return;
      }
      */

      const blob = await dictationRef.current.stop();
      if (!blob) return;
      const transcript = await transcribeVoiceBlob(blob, getConversationId());
      applyDictationText(transcript);
    } catch {
      /* ignore */
    } finally {
      store.setBusy(false);
      setFormMicState("idle");
      closeDictation();
    }
  }, [
    dictationState,
    aui,
    applyDictationText,
    getConversationId,
    closeDictation,
  ]);

  const toggleDictationPause = useCallback(() => {
    if (dictationState !== "recording") return;
    if (dictationPaused) {
      dictationRef.current.resume();
      setDictationPaused(false);
      return;
    }
    dictationRef.current.pause();
    setDictationPaused(true);
  }, [dictationState, dictationPaused]);

  const startLiveVoice = useCallback(() => {
    if (FORM_MODULE_ENABLED && FORM_FILL_VIA_CHAT_ENABLED && mode === "form-fill") return;
    liveStart();
  }, [mode, liveStart]);

  const stopLiveVoice = useCallback(() => {
    void liveStop();
  }, [liveStop]);

  useEffect(() => {
    if (!dictationOpen || dictationState !== "recording" || dictationPaused) return;

    let frame = 0;
    const tick = () => {
      const analyser = dictationRef.current.analyser;
      if (analyser) {
        setDictationLevels(waveformScrollerRef.current.tick(analyser));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [dictationOpen, dictationState, dictationPaused]);

  const value: VoiceComposerContextValue = {
    dictationOpen,
    dictationState,
    dictationLevels,
    dictationPaused,
    liveVoiceState: (FORM_MODULE_ENABLED && FORM_FILL_VIA_CHAT_ENABLED && mode === "form-fill" && formMicState !== "idle") ? formMicState : liveVoiceState,
    isLiveVoiceBusy: VOICE_BUSY_STATES.includes(
      (FORM_MODULE_ENABLED && FORM_FILL_VIA_CHAT_ENABLED && mode === "form-fill" && formMicState !== "idle") ? formMicState : liveVoiceState,
    ),
    openDictationCapture,
    confirmDictation,
    cancelDictation,
    toggleDictationPause,
    startLiveVoice,
    stopLiveVoice,
  };

  return (
    <VoiceComposerContext.Provider value={value}>
      {children}
    </VoiceComposerContext.Provider>
  );
}

export function VoiceMicControl() {
  const { dictationOpen, dictationState, openDictationCapture } = useVoiceComposerContext();
  const busy = dictationState === "processing";

  return (
    <TooltipIconButton
      tooltip="Ghi âm"
      side="bottom"
      type="button"
      variant="ghost"
      size="icon"
      className="aui-composer-voice-mic hover:bg-muted-foreground/15 size-7 rounded-full"
      disabled={dictationOpen || busy}
      aria-label="Ghi âm"
      onClick={() => void openDictationCapture()}
    >
      <Mic className="size-4.5 stroke-[1.5px]" />
    </TooltipIconButton>
  );
}

function VoiceLiveConversationButton() {
  const { startLiveVoice, stopLiveVoice, liveVoiceState } = useVoiceComposerContext();
  const mode = useFormModuleStore((s) => s.mode);

  if (!LIVE_CONVERSATION_ENABLED || (FORM_MODULE_ENABLED && FORM_FILL_VIA_CHAT_ENABLED && mode === "form-fill")) return null;

  const isActive =
    liveVoiceState === "recording" ||
    liveVoiceState === "uploading" ||
    liveVoiceState === "processing";
  const disabled =
    liveVoiceState === "uploading" ||
    liveVoiceState === "processing" ||
    liveVoiceState === "playing";
  const canInteract =
    !disabled &&
    (liveVoiceState === "idle" || liveVoiceState === "recording" || liveVoiceState === "error");

  return (
    <button
      type="button"
      aria-label="Đàm thoại trực tiếp"
      disabled={disabled}
      className={`aui-composer-live-voice inline-flex size-7 items-center justify-center rounded-full transition-colors ${
        liveVoiceState === "recording"
          ? "bg-destructive text-destructive-foreground animate-pulse"
          : "text-muted-foreground hover:bg-muted"
      } ${isActive ? "cursor-default" : "cursor-pointer"}`}
      onPointerDown={
        canInteract
          ? () => {
              if (liveVoiceState === "idle" || liveVoiceState === "error") startLiveVoice();
            }
          : undefined
      }
      onPointerUp={
        canInteract
          ? () => {
              if (liveVoiceState === "recording") stopLiveVoice();
            }
          : undefined
      }
      onPointerLeave={
        canInteract
          ? () => {
              if (liveVoiceState === "recording") stopLiveVoice();
            }
          : undefined
      }
    >
      <AudioLines className="size-4.5 stroke-[1.5px]" />
    </button>
  );
}

export function VoicePhaseLabel() {
  const t = useT();
  const { liveVoiceState, dictationState } = useVoiceComposerContext();
  const state = dictationState === "processing" ? "processing" : liveVoiceState;
  const key = PHASE_KEYS[state as VoiceState];
  const label = key ? t(key) : null;
  if (!label) return null;

  return (
    <span className="text-muted-foreground text-xs" aria-live="polite">
      {label}
    </span>
  );
}

export function VoiceComposerTrailingAction() {
  const t = useT();
  const { isLiveVoiceBusy, dictationState } = useVoiceComposerContext();
  const busy = isLiveVoiceBusy || dictationState === "processing";

  return (
    <>
      <VoicePhaseLabel />
      <AuiIf condition={(s) => s.composer.isEmpty}>
        <VoiceLiveConversationButton />
      </AuiIf>
      <AuiIf condition={(s) => !s.composer.isEmpty && !s.thread.isRunning}>
        <ComposerPrimitive.Send
          disabled={busy}
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
      <AuiIf condition={(s) => !s.composer.isEmpty && s.thread.isRunning}>
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

/** @deprecated Use VoiceComposerTrailingAction */
export const VoiceComposerSendControls = VoiceComposerTrailingAction;

export function ComposerDropzoneShell({ children }: { children?: ReactNode }) {
  const { dictationOpen } = useVoiceComposerContext();

  if (dictationOpen) {
    return (
      <div
        data-slot="aui_composer-shell"
        className="flex w-full min-w-0 flex-col"
      >
        {children}
      </div>
    );
  }

  return (
    <div
      data-slot="aui_composer-shell"
      className="border-border/60 data-[dragging=true]:border-ring focus-within:border-border dark:border-muted-foreground/15 dark:focus-within:border-muted-foreground/30 flex w-full flex-col gap-2 rounded-(--composer-radius) border bg-(--composer-bg) p-(--composer-padding) shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] transition-[border-color,box-shadow] focus-within:shadow-[0_6px_24px_-8px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.05)] data-[dragging=true]:border-dashed data-[dragging=true]:bg-[color-mix(in_oklab,var(--color-accent)_50%,var(--color-background))] dark:shadow-none"
    >
      {children}
    </div>
  );
}

export function ComposerDictationAttachments({ children }: { children: ReactNode }) {
  const { dictationOpen } = useVoiceComposerContext();
  if (dictationOpen) return null;
  return <>{children}</>;
}

export function ComposerDictationInput({
  placeholder,
}: {
  placeholder: string;
}) {
  const { dictationOpen } = useVoiceComposerContext();
  if (dictationOpen) return null;

  return (
    <ComposerPrimitive.Input
      placeholder={placeholder}
      className="aui-composer-input placeholder:text-muted-foreground/80 max-h-32 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-base outline-none"
      rows={1}
      autoFocus
      aria-label="Message input"
    />
  );
}

export function VoiceComposerActionBar({ initialAuth }: { initialAuth: boolean }) {
  const {
    dictationOpen,
    dictationState,
    dictationLevels,
    dictationPaused,
    confirmDictation,
    cancelDictation,
    toggleDictationPause,
  } = useVoiceComposerContext();

  if (dictationOpen) {
    return (
      <div className="aui-voice-capture-shell w-full min-w-0">
        <VoiceCaptureBar
          state={dictationState}
          levels={dictationLevels}
          paused={dictationPaused}
          initialAuth={initialAuth}
          busy={dictationState === "processing"}
          onConfirm={() => void confirmDictation()}
          onCancel={cancelDictation}
          onTogglePause={toggleDictationPause}
        />
      </div>
    );
  }

  return (
    <div className="aui-composer-action-wrapper relative flex w-full items-center justify-between">
      <ComposerPlusMenu formPickerDisabled={false} />
      <div className="flex items-center gap-1.5">
        <VoiceMicControl />
        <VoiceComposerTrailingAction />
      </div>
    </div>
  );
}