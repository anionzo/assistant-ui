"use client";

import { VoiceFormSessionInit } from "@/components/voice-form/voice-form-session-init";
import { VoiceFormSplitPane } from "@/components/voice-form/voice-form-split-pane";
import { TooltipIconButton } from "@/components/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  loadFormDetail,
  loadFormList,
  outputDownloadUrl,
  postFill,
  renderDocx,
  renderPreview,
  ttsAudioUrl,
} from "@/lib/voice-form/api";
import { VoiceFormRecorder } from "@/lib/voice-form/recorder";
import { useVoiceFormSession } from "@/lib/voice-form/session-context";
import type { ChatTurn, FillResponse, FormField, FormSchema, FormSummary } from "@/lib/voice-form/types";
import { cn } from "@/lib/utils";
import {
  ArrowUpIcon,
  Check,
  CloudOff,
  FileDown,
  Loader2,
  Mic,
  RefreshCw,
  Volume2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const BOOL_TYPES = new Set(["bool", "boolean", "checkbox", "yesno"]);
const PREVIEW_DEBOUNCE_MS = 2500;
const MAX_RECORD_MS = 25000;

function basename(path: string): string {
  if (!path) return "";
  return (path.split(/[\\/]/).pop() || "").split("?")[0];
}

function displayValue(field: FormField | null, raw: unknown): string {
  if (raw === undefined || raw === null || raw === "") return "";
  const ft = String(field?.field_type || "").toLowerCase();
  if (BOOL_TYPES.has(ft) || typeof raw === "boolean") {
    if (raw === true || raw === "true") return "Có";
    if (raw === false || raw === "false") return "Không";
  }
  return String(raw);
}

function nowHM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function SaveStatusBadge({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        <Loader2 className="size-3 animate-spin" /> Đang lưu…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        <Check className="size-3 text-green-600" /> Đã lưu
      </span>
    );
  }
  return (
    <span className="text-destructive inline-flex items-center gap-1 text-xs">
      <CloudOff className="size-3" /> Lỗi lưu
    </span>
  );
}

export function VoiceFormView() {
  const {
    initialAuth,
    gatewaySessionId,
    saveStatus,
    sessionBusy,
    restoredRecord,
    consumeRestoredRecord,
    persistSession,
    setGuestGatewayId,
  } = useVoiceFormSession();

  const [forms, setForms] = useState<FormSummary[]>([]);
  const [formCode, setFormCode] = useState("");
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [nextField, setNextField] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<Record<string, string>>({});
  const [decision, setDecision] = useState("incomplete");
  const [outputFile, setOutputFile] = useState("");
  const [lastAudioFile, setLastAudioFile] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Sẵn sàng");
  const [statusKind, setStatusKind] = useState<"" | "busy" | "error" | "rec">("");
  const [toast, setToast] = useState<{ msg: string; bad?: boolean } | null>(null);
  const [formSearch, setFormSearch] = useState("");
  const [textInput, setTextInput] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [micAvailable, setMicAvailable] = useState(false);
  const [recording, setRecording] = useState(false);

  const recorderRef = useRef(new VoiceFormRecorder());
  const previewTokenRef = useRef(0);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string, bad = false) => {
    setToast({ msg, bad });
    setTimeout(() => setToast(null), 3600);
  }, []);

  const workspaceSnapshot = useCallback(
    () => ({
      formCode,
      formName: schema?.form_name ?? formCode,
      fieldValues,
      history,
      decision,
    }),
    [formCode, schema, fieldValues, history, decision],
  );

  const schedulePreview = useCallback(
    (immediate = false) => {
      if (!formCode || !gatewaySessionId) {
        setPreviewHtml("");
        return;
      }
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      previewTimerRef.current = setTimeout(
        async () => {
          const token = ++previewTokenRef.current;
          setPreviewLoading(true);
          try {
            const data = await renderPreview(formCode, fieldValues, gatewaySessionId);
            if (token !== previewTokenRef.current) return;
            setPreviewHtml(data.html || "");
            if (data.output_file) setOutputFile(basename(data.output_file));
          } catch (err) {
            if (token !== previewTokenRef.current) return;
            setPreviewHtml(
              `<p class="text-sm text-muted-foreground">Không tạo được bản xem trước: ${String(err instanceof Error ? err.message : err)}</p>`,
            );
          } finally {
            if (token === previewTokenRef.current) setPreviewLoading(false);
          }
        },
        immediate ? 60 : PREVIEW_DEBOUNCE_MS,
      );
    },
    [formCode, fieldValues, gatewaySessionId],
  );

  const clearWorkspace = useCallback(() => {
    setFormCode("");
    setSchema(null);
    setFieldValues({});
    setHistory([]);
    setNextField(null);
    setInvalidFields({});
    setDecision("incomplete");
    setOutputFile("");
    setLastAudioFile("");
    setPreviewHtml("");
  }, []);

  const applyRestoredRecord = useCallback(
    async (record: NonNullable<typeof restoredRecord>) => {
      setFormCode(record.formCode);
      setFieldValues(record.fieldValues ?? {});
      setHistory(
        (record.history ?? []).map((t) => ({
          role: t.role as "user" | "assistant",
          text: t.text,
          time: nowHM(),
        })),
      );
      setDecision(record.decision || "incomplete");
      setNextField(null);
      setInvalidFields({});
      setOutputFile("");
      setLastAudioFile("");

      if (record.formCode) {
        const detail = await loadFormDetail(record.formCode);
        const formSchema = detail.form_schema;
        if (!formSchema?.need_to_fill?.length) {
          throw new Error("Biểu mẫu này chưa có lược đồ trường (need_to_fill).");
        }
        setSchema(formSchema);
        setForms((prev) =>
          prev.some((f) => f.form_code === record.formCode)
            ? prev
            : [{ form_code: record.formCode, form_name: formSchema.form_name || record.formCode }, ...prev],
        );
        schedulePreview(true);
        setStatus("Sẵn sàng");
        setStatusKind("");
      } else {
        clearWorkspace();
        setStatus("Chọn biểu mẫu cho phiên này");
        setStatusKind("");
      }
    },
    [schedulePreview, clearWorkspace],
  );

  useEffect(() => {
    if (!restoredRecord) return;
    void applyRestoredRecord(restoredRecord)
      .catch((err) => showToast(String(err instanceof Error ? err.message : err), true))
      .finally(() => consumeRestoredRecord());
  }, [restoredRecord, applyRestoredRecord, consumeRestoredRecord, showToast]);

  const applyFillResponse = useCallback(
    (data: FillResponse, opts: { fromVoice?: boolean; echoedUserTurn?: string } = {}) => {
      if (!initialAuth && data.session_id) setGuestGatewayId(data.session_id);

      const mode = data.mode || "fill_form";
      const adopted = mode === "pick_form" && data.form_code && data.form_code !== formCode;

      if (adopted && data.form_code) {
        setFormCode(data.form_code);
        if (data.form_schema?.need_to_fill?.length) setSchema(data.form_schema);
        setFieldValues({});
        setOutputFile("");
        setLastAudioFile("");
      } else if (data.form_schema?.need_to_fill?.length) {
        setSchema(data.form_schema);
        if (data.form_code) setFormCode(data.form_code);
      }

      if (data.field_values) setFieldValues(data.field_values);
      setNextField(data.next_field ?? null);
      setInvalidFields(data.invalid_fields ?? {});
      setDecision(data.decision || mode);
      if (data.output_file) setOutputFile(basename(data.output_file));

      const transcript = (data.transcript || "").trim();
      const prompt = (data.voice_prompt || data.answer || "").trim();

      const nextHistory: ChatTurn[] = [...history];
      if (transcript && !opts.echoedUserTurn) nextHistory.push({ role: "user", text: transcript, time: nowHM() });
      if (prompt) nextHistory.push({ role: "assistant", text: prompt, time: nowHM() });
      const trimmedHistory = nextHistory.slice(-24);
      setHistory(trimmedHistory);

      if (mode === "chat") {
        setStatus("Sẵn sàng");
        setStatusKind("");
      } else if (["ready", "confirm"].includes(data.decision || "") || data.output_file) {
        setStatus(data.output_file ? "Đã tạo tờ khai — bấm “Tạo & tải tờ khai”" : "Đã đủ thông tin");
        setStatusKind("");
      } else if (data.decision === "invalid") {
        setStatus("Cần đọc lại một mục");
        setStatusKind("error");
      } else if (adopted) {
        setStatus("Đã mở biểu mẫu");
        setStatusKind("");
      } else {
        setStatus(transcript ? "Đã ghi nhận" : "Chưa nghe rõ — thử lại");
        setStatusKind("");
      }

      const audioName = basename(data.audio_file || data.audio_url || "");
      if (audioName) {
        setLastAudioFile(audioName);
        if (opts.fromVoice && audioRef.current) {
          audioRef.current.src = ttsAudioUrl(audioName);
          void audioRef.current.play().catch(() => undefined);
        }
      }

      schedulePreview(true);
      void persistSession(workspaceSnapshot(), {
        formCode: data.form_code ?? formCode,
        formName: data.form_schema?.form_name ?? schema?.form_name,
        fieldValues: data.field_values ?? fieldValues,
        history: trimmedHistory,
        decision: data.decision || mode,
      });
    },
    [
      initialAuth,
      formCode,
      schema,
      fieldValues,
      history,
      schedulePreview,
      persistSession,
      workspaceSnapshot,
      setGuestGatewayId,
    ],
  );

  const postTurn = useCallback(
    async (extra: Record<string, string | Blob>, opts: { fromVoice?: boolean; echoedUserTurn?: string } = {}) => {
      if (busy || !gatewaySessionId) return;
      setBusy(true);
      setStatus(opts.fromVoice ? "Đang nhận dạng & xử lý…" : "Đang xử lý…");
      setStatusKind("busy");
      try {
        const payload: Record<string, string | Blob> = {
          session_id: gatewaySessionId,
          field_values: JSON.stringify(fieldValues),
          history: JSON.stringify(history),
          ...extra,
        };
        if (formCode) payload.form_code = formCode;
        const data = await postFill(gatewaySessionId, payload);
        applyFillResponse(data, opts);
      } catch (err) {
        setStatus("Lỗi");
        setStatusKind("error");
        showToast(`Không xử lý được: ${String(err instanceof Error ? err.message : err)}`, true);
      } finally {
        setBusy(false);
      }
    },
    [busy, gatewaySessionId, fieldValues, history, formCode, applyFillResponse, showToast],
  );

  const selectForm = useCallback(
    async (code: string) => {
      if (!code || busy) return;
      setStatus("Đang tải biểu mẫu…");
      setStatusKind("busy");
      try {
        const detail = await loadFormDetail(code);
        const formSchema = detail.form_schema;
        if (!formSchema?.need_to_fill?.length) {
          throw new Error("Biểu mẫu này chưa có lược đồ trường (need_to_fill).");
        }
        setFormCode(code);
        setSchema(formSchema);
        setFieldValues({});
        setHistory([]);
        setNextField(null);
        setInvalidFields({});
        setDecision("incomplete");
        setOutputFile("");
        setLastAudioFile("");

        setForms((prev) =>
          prev.some((f) => f.form_code === code)
            ? prev
            : [{ form_code: code, form_name: formSchema.form_name || code }, ...prev],
        );
        setStatus("Sẵn sàng");
        setStatusKind("");
        schedulePreview(true);
        void persistSession(workspaceSnapshot(), {
          formCode: code,
          formName: formSchema.form_name || code,
          fieldValues: {},
          history: [],
          decision: "incomplete",
        });
      } catch (err) {
        setStatus("Lỗi");
        setStatusKind("error");
        showToast(String(err instanceof Error ? err.message : err), true);
      }
    },
    [busy, schedulePreview, persistSession, workspaceSnapshot, showToast],
  );

  const sendText = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t || busy) return;
      setTextInput("");
      const nextHistory = [...history, { role: "user" as const, text: t, time: nowHM() }].slice(-24);
      setHistory(nextHistory);
      void postTurn({ text: t }, { echoedUserTurn: t });
    },
    [busy, postTurn, history],
  );

  const handleDownload = useCallback(async () => {
    if (!formCode || busy || !gatewaySessionId) return;
    setStatus("Đang tạo tờ khai…");
    setStatusKind("busy");
    try {
      const data = await renderDocx(formCode, fieldValues, gatewaySessionId);
      const file = basename(data.output_file || data.file_path || "");
      if (!file) throw new Error("không nhận được tên file");
      setOutputFile(file);
      const a = document.createElement("a");
      a.href = outputDownloadUrl(file);
      a.download = file;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setStatus("Đã tạo tờ khai");
      setStatusKind("");
      showToast(
        !["ready", "confirm"].includes(decision)
          ? "Đã tạo file — các mục còn trống được để trắng."
          : "Đã tạo tờ khai.",
      );
    } catch (err) {
      setStatus("Lỗi tạo tờ khai");
      setStatusKind("error");
      showToast(`Không tạo được tờ khai: ${String(err instanceof Error ? err.message : err)}`, true);
    }
  }, [formCode, busy, fieldValues, gatewaySessionId, decision, showToast]);

  useEffect(() => {
    setMicAvailable(!!navigator.mediaDevices?.getUserMedia);
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, busy]);

  useEffect(() => {
    if (formCode && gatewaySessionId) schedulePreview();
  }, [fieldValues, formCode, gatewaySessionId, schedulePreview]);

  const fields = schema?.need_to_fill ?? [];
  const progress = useMemo(() => {
    let filled = 0;
    let total = 0;
    for (const f of fields) {
      if (!f?.key) continue;
      if (f.required) {
        total++;
        const v = fieldValues[f.key];
        const has = !(v === undefined || v === null || v === "");
        const invalid = Object.hasOwn(invalidFields, f.key);
        if (has && !invalid) filled++;
      }
    }
    const pct = total ? Math.round((filled / total) * 100) : 100;
    return { filled, total, pct };
  }, [fields, fieldValues, invalidFields]);

  const beginRecording = async () => {
    if (busy || recording || !micAvailable) return;
    try {
      await recorderRef.current.start();
      setRecording(true);
      setStatus("Đang nghe… (giữ nút)");
      setStatusKind("rec");
      setTimeout(() => {
        if (recorderRef.current.active) {
          showToast("Đã ghi đủ dài — gửi đi.");
          void endRecording();
        }
      }, MAX_RECORD_MS);
    } catch (err) {
      showToast(`Không truy cập được micro: ${String(err instanceof Error ? err.message : err)}`, true);
      setStatus("Lỗi micro");
      setStatusKind("error");
    }
  };

  const endRecording = async () => {
    if (!recording) return;
    setRecording(false);
    const blob = await recorderRef.current.stop();
    if (!blob) {
      setStatus("Chưa nghe rõ — thử lại");
      setStatusKind("");
      return;
    }
    void postTurn({ audio: blob }, { fromVoice: true });
  };

  const statusClass =
    statusKind === "error"
      ? "text-destructive"
      : statusKind === "busy" || statusKind === "rec"
        ? "text-primary"
        : "text-muted-foreground";

  const workspaceDisabled = busy || sessionBusy;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4">
      <VoiceFormSessionInit
        onReady={(list) => {
          setForms(list);
          if (!initialAuth) {
            setStatus("Đăng nhập để lưu phiên điền mẫu");
            setStatusKind("");
          }
        }}
        onError={(err) => {
          setStatus("Không tải được dữ liệu");
          setStatusKind("error");
          showToast(String(err instanceof Error ? err.message : err), true);
        }}
      />

      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-2 text-sm shadow-lg ${
            toast.bad ? "bg-destructive text-white" : "bg-foreground text-background"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <header className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Input
            type="search"
            placeholder="Tìm biểu mẫu (vd: tạm trú, thuế thu nhập)…"
            className="min-w-0 flex-1"
            value={formSearch}
            disabled={workspaceDisabled}
            onChange={(e) => {
              setFormSearch(e.target.value);
              const q = e.target.value;
              setTimeout(() => {
                loadFormList(q).then(setForms).catch((err) => showToast(String(err instanceof Error ? err.message : err), true));
              }, 350);
            }}
          />
          <select
            className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 min-w-[160px] rounded-md border px-2.5 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
            value={formCode}
            disabled={workspaceDisabled}
            onChange={(e) => void selectForm(e.target.value)}
            aria-label="Chọn biểu mẫu"
          >
            <option value="">{forms.length ? "— chọn biểu mẫu —" : "(không có biểu mẫu)"}</option>
            {forms.map((f) => (
              <option key={f.form_code} value={f.form_code}>
                {f.form_name} · {f.form_code}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          {initialAuth && <SaveStatusBadge status={saveStatus} />}
          <div className={`text-sm font-medium ${statusClass}`}>{status}</div>
        </div>
      </header>

      <VoiceFormSplitPane
        left={
        <section className="flex h-full min-h-0 flex-col gap-3">
          <div className="flex shrink-0 gap-3 rounded-xl border bg-card p-4">
            <Button
              type="button"
              variant="outline"
              disabled={workspaceDisabled || !micAvailable}
              onPointerDown={(e) => { e.preventDefault(); void beginRecording(); }}
              onPointerUp={(e) => { e.preventDefault(); void endRecording(); }}
              onPointerLeave={() => { if (recording) void endRecording(); }}
              className={cn(
                "size-20 shrink-0 rounded-full border-2 p-0",
                recording
                  ? "border-primary bg-primary/10 text-primary hover:bg-primary/10"
                  : "border-muted-foreground/30 hover:border-primary",
              )}
              aria-label="Giữ để nói"
            >
              <Mic className="size-8" />
            </Button>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              <p className="text-sm text-muted-foreground">
                {micAvailable ? "Giữ để nói · hoặc nhắn tin bên dưới" : "Micro không khả dụng — dùng ô nhắn tin"}
              </p>
              <audio ref={audioRef} className="hidden" />
              {lastAudioFile && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto w-fit gap-1 px-0"
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.src = ttsAudioUrl(lastAudioFile);
                      void audioRef.current.play().catch(() => undefined);
                    }
                  }}
                >
                  <Volume2 className="size-4" /> Nghe lại
                </Button>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-xl border bg-card">
            <div className="border-b px-3 py-2 text-sm font-medium">Hội thoại</div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {history.length === 0 && !busy && (
                <p className="text-sm text-muted-foreground">
                  Bắt đầu trò chuyện — nhắn tin hoặc giữ nút mic. Ví dụ: &quot;tôi muốn đăng ký tạm trú&quot;.
                </p>
              )}
              <ul className="space-y-3">
                {history.map((turn, i) => (
                  <li key={`${turn.role}-${i}`} className={`flex gap-2 ${turn.role === "user" ? "justify-end" : ""}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        turn.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {turn.text}
                      {turn.time && <div className="mt-1 text-[10px] opacity-70">{turn.time}</div>}
                    </div>
                  </li>
                ))}
                {busy && (
                  <li className="flex gap-2">
                    <div className="rounded-2xl bg-muted px-3 py-2 text-sm">
                      <Loader2 className="inline size-4 animate-spin" /> Đang xử lý…
                    </div>
                  </li>
                )}
              </ul>
              <div ref={transcriptEndRef} />
            </div>
            <form
              className="flex items-center gap-2 border-t p-3"
              onSubmit={(e) => {
                e.preventDefault();
                sendText(textInput);
              }}
            >
              <Input
                type="text"
                value={textInput}
                disabled={workspaceDisabled}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Nhắn tin cho trợ lý…"
                className="min-w-0 flex-1"
              />
              <TooltipIconButton
                tooltip="Gửi tin nhắn"
                type="submit"
                variant="default"
                size="icon"
                className="aui-composer-send size-7 shrink-0 rounded-full"
                disabled={workspaceDisabled || !textInput.trim()}
                aria-label="Gửi tin nhắn"
              >
                <ArrowUpIcon className="aui-composer-send-icon size-4.5" />
              </TooltipIconButton>
            </form>
          </div>
        </section>
        }
        right={
        <section className="flex h-full min-h-0 flex-col gap-3">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
            {schema && (
              <div className="border-b px-3 py-2">
                <h2 className="font-semibold">{schema.form_name || formCode}</h2>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {progress.total
                      ? `${progress.filled}/${progress.total} mục bắt buộc`
                      : "không có mục bắt buộc"}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress.pct}%` }} />
                  </div>
                </div>
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleDownload()}
                    disabled={!formCode || workspaceDisabled}
                  >
                    <FileDown data-icon="inline-start" />
                    Tạo & tải tờ khai
                  </Button>
                </div>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {!schema ? (
                <p className="text-sm text-muted-foreground">
                  Chọn một biểu mẫu, hoặc nhắn cho trợ lý điều bạn muốn làm.
                </p>
              ) : (
                <div className="space-y-2">
                  {fields.map((f) => {
                    if (!f?.key) return null;
                    const rawVal = fieldValues[f.key];
                    const hasVal = !(rawVal === undefined || rawVal === null || rawVal === "");
                    const isInvalid = Object.hasOwn(invalidFields, f.key);
                    const isNext = nextField === f.key;
                    return (
                      <div
                        key={f.key}
                        className={`rounded-lg border px-3 py-2 ${
                          isInvalid ? "border-destructive/50 bg-destructive/5" : isNext ? "border-primary/50 bg-primary/5" : hasVal ? "border-green-500/30" : ""
                        }`}
                      >
                        <label className="text-xs font-medium">
                          {f.label || f.key}
                          {f.required && <span className="text-destructive"> *</span>}
                        </label>
                        <Input
                          type="text"
                          className="mt-1 h-8"
                          value={displayValue(f, rawVal)}
                          placeholder={f.hint || (isNext ? "Đọc giá trị này hoặc gõ tay…" : "")}
                          onChange={(e) => {
                            const v = e.target.value.trim();
                            setFieldValues((prev) => {
                              const next = { ...prev };
                              if (v) next[f.key] = v;
                              else delete next[f.key];
                              return next;
                            });
                            setInvalidFields((prev) => {
                              if (!prev[f.key]) return prev;
                              const next = { ...prev };
                              delete next[f.key];
                              return next;
                            });
                          }}
                        />
                        {isInvalid && (
                          <p className="mt-1 text-xs text-destructive">{invalidFields[f.key] || "Giá trị chưa hợp lệ."}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-3 py-2 text-sm font-medium">
              <span>Xem trước tờ khai</span>
              {previewLoading && <RefreshCw className="size-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm">
              {!formCode ? (
                <p className="text-muted-foreground">Chọn một biểu mẫu để xem trước nội dung.</p>
              ) : previewHtml ? (
                <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              ) : previewLoading ? (
                <p className="text-muted-foreground">Đang tạo bản xem trước từ tệp .docx…</p>
              ) : (
                <p className="text-muted-foreground">Chưa có nội dung xem trước.</p>
              )}
            </div>
          </div>
        </section>
        }
      />
    </div>
  );
}