"use client";

import {
  loadDraft,
  loadFormDetail,
  loadFormList,
  outputDownloadUrl,
  postFill,
  renderDocx,
  renderPreview,
  saveDraft,
  ttsAudioUrl,
} from "@/lib/voice-form/api";
import {
  formatConvLabel,
  getActiveConversationId,
  loadConversations,
  saveConversations,
  setActiveConversationId,
  upsertConversation,
} from "@/lib/voice-form/conversations";
import { VoiceFormRecorder } from "@/lib/voice-form/recorder";
import type { ChatTurn, ConversationStub, FillResponse, FormField, FormSchema, FormSummary } from "@/lib/voice-form/types";
import {
  FileDown,
  Loader2,
  Mic,
  Plus,
  RefreshCw,
  Send,
  Trash2,
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

export function VoiceFormView() {
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [conversations, setConversations] = useState<ConversationStub[]>([]);
  const [sessionId, setSessionId] = useState("");
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

  const refreshConversations = useCallback(() => {
    setConversations(loadConversations());
  }, []);

  const touchConversation = useCallback(() => {
    if (!sessionId) return;
    const fieldCount = Object.keys(fieldValues).filter((k) => {
      const v = fieldValues[k];
      return !(v === undefined || v === null || v === "");
    }).length;
    upsertConversation({
      id: sessionId,
      formCode,
      formName: schema?.form_name || formCode,
      fieldCount,
      decision,
    });
    refreshConversations();
  }, [sessionId, fieldValues, formCode, schema, decision, refreshConversations]);

  const schedulePreview = useCallback(
    (immediate = false) => {
      if (!formCode) {
        setPreviewHtml("");
        return;
      }
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      previewTimerRef.current = setTimeout(
        async () => {
          const token = ++previewTokenRef.current;
          setPreviewLoading(true);
          try {
            const data = await renderPreview(formCode, fieldValues, sessionId);
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
    [formCode, fieldValues, sessionId],
  );

  const applyFillResponse = useCallback(
    (data: FillResponse, opts: { fromVoice?: boolean; echoedUserTurn?: string } = {}) => {
      if (data.session_id) {
        setSessionId(data.session_id);
        setActiveConversationId(data.session_id);
      }

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

      setHistory((prev) => {
        const next = [...prev];
        if (transcript && !opts.echoedUserTurn) next.push({ role: "user", text: transcript, time: nowHM() });
        if (prompt) next.push({ role: "assistant", text: prompt, time: nowHM() });
        return next.slice(-24);
      });

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
      touchConversation();
    },
    [formCode, schedulePreview, touchConversation],
  );

  const postTurn = useCallback(
    async (extra: Record<string, string | Blob>, opts: { fromVoice?: boolean; echoedUserTurn?: string } = {}) => {
      if (busy) return;
      setBusy(true);
      setStatus(opts.fromVoice ? "Đang nhận dạng & xử lý…" : "Đang xử lý…");
      setStatusKind("busy");
      try {
        const payload: Record<string, string | Blob> = {
          session_id: sessionId,
          field_values: JSON.stringify(fieldValues),
          history: JSON.stringify(history),
          ...extra,
        };
        if (formCode) payload.form_code = formCode;
        const data = await postFill(sessionId, payload);
        applyFillResponse(data, opts);
      } catch (err) {
        setStatus("Lỗi");
        setStatusKind("error");
        showToast(`Không xử lý được: ${String(err instanceof Error ? err.message : err)}`, true);
      } finally {
        setBusy(false);
      }
    },
    [busy, sessionId, fieldValues, history, formCode, applyFillResponse, showToast],
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

        const sid = sessionId || crypto.randomUUID();
        if (!sessionId) {
          setSessionId(sid);
          setActiveConversationId(sid);
        }

        const draft = await loadDraft(code, sid);
        if (draft) {
          if (draft.session_id) {
            setSessionId(draft.session_id);
            setActiveConversationId(draft.session_id);
          }
          if (draft.field_values) setFieldValues(draft.field_values);
          if (draft.history?.length) {
            setHistory(
              draft.history.map((t) => ({
                role: t.role as "user" | "assistant",
                text: t.text,
                time: nowHM(),
              })),
            );
          }
        }

        setForms((prev) =>
          prev.some((f) => f.form_code === code)
            ? prev
            : [{ form_code: code, form_name: formSchema.form_name || code }, ...prev],
        );
        setStatus("Sẵn sàng");
        setStatusKind("");
        schedulePreview(true);
        touchConversation();
      } catch (err) {
        setStatus("Lỗi");
        setStatusKind("error");
        showToast(String(err instanceof Error ? err.message : err), true);
      }
    },
    [busy, sessionId, schedulePreview, touchConversation, showToast],
  );

  const newConversation = useCallback(() => {
    if (busy) {
      showToast("Đang xử lý — chờ một lát.");
      return;
    }
    const id = crypto.randomUUID();
    setSessionId(id);
    setActiveConversationId(id);
    upsertConversation({ id, formCode: "", formName: "", fieldCount: 0, decision: "" });
    refreshConversations();
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
    setStatus("Cuộc hội thoại mới — chọn biểu mẫu");
    setStatusKind("");
    showToast("Đã tạo cuộc hội thoại mới.");
  }, [busy, refreshConversations, showToast]);

  const switchConversation = useCallback(
    async (id: string) => {
      if (busy) {
        showToast("Đang xử lý — chờ một lát.");
        return;
      }
      const conv = loadConversations().find((c) => c.id === id);
      if (!conv) return;
      setSessionId(id);
      setActiveConversationId(id);
      if (conv.formCode) {
        await selectForm(conv.formCode);
      } else {
        setFormCode("");
        setSchema(null);
        setFieldValues({});
        setHistory([]);
        setPreviewHtml("");
        setStatus("Chọn biểu mẫu cho cuộc hội thoại này");
        setStatusKind("");
      }
      refreshConversations();
    },
    [busy, selectForm, refreshConversations, showToast],
  );

  const deleteConversation = useCallback(() => {
    if (busy || !sessionId) return;
    const list = loadConversations().filter((c) => c.id !== sessionId);
    saveConversations(list);
    refreshConversations();
    if (list.length) void switchConversation(list[0].id);
    else newConversation();
    showToast("Đã xóa cuộc hội thoại.");
  }, [busy, sessionId, switchConversation, newConversation, refreshConversations, showToast]);

  const sendText = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t || busy) return;
      setTextInput("");
      setHistory((prev) => [...prev, { role: "user" as const, text: t, time: nowHM() }].slice(-24));
      touchConversation();
      void postTurn({ text: t }, { echoedUserTurn: t });
    },
    [busy, postTurn, touchConversation],
  );

  const handleDownload = useCallback(async () => {
    if (!formCode || busy) return;
    setStatus("Đang tạo tờ khai…");
    setStatusKind("busy");
    try {
      const data = await renderDocx(formCode, fieldValues, sessionId);
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
  }, [formCode, busy, fieldValues, sessionId, decision, showToast]);

  const handleSaveDraft = useCallback(async () => {
    if (!formCode) return;
    try {
      const data = await saveDraft(formCode, sessionId, fieldValues, history);
      if (data.session_id) {
        setSessionId(data.session_id);
        setActiveConversationId(data.session_id);
      }
      touchConversation();
      showToast("Đã lưu nháp.");
    } catch (err) {
      showToast(`Lưu nháp thất bại: ${String(err instanceof Error ? err.message : err)}`, true);
    }
  }, [formCode, sessionId, fieldValues, history, touchConversation, showToast]);

  useEffect(() => {
    setMicAvailable(!!navigator.mediaDevices?.getUserMedia);
    loadFormList("")
      .then((list) => {
        setForms(list);
        refreshConversations();
        const convs = loadConversations();
        const activeId = getActiveConversationId();
        if (activeId && convs.some((c) => c.id === activeId)) {
          void switchConversation(activeId);
        } else if (convs.length) {
          void switchConversation(convs[0].id);
        } else {
          newConversation();
        }
      })
      .catch((err) => {
        setStatus("Không tải được danh sách biểu mẫu");
        setStatusKind("error");
        showToast(String(err instanceof Error ? err.message : err), true);
        if (!sessionId) newConversation();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, busy]);

  useEffect(() => {
    if (formCode) schedulePreview();
  }, [fieldValues, formCode, schedulePreview]);

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

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-2 text-sm shadow-lg ${
            toast.bad ? "bg-destructive text-white" : "bg-foreground text-background"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <header className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <select
            className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
            value={sessionId}
            onChange={(e) => void switchConversation(e.target.value)}
            aria-label="Cuộc hội thoại"
          >
            {conversations.length === 0 ? (
              <option value="">(chưa có cuộc hội thoại)</option>
            ) : (
              conversations.map((c) => (
                <option key={c.id} value={c.id}>
                  {formatConvLabel(c)}
                </option>
              ))
            )}
          </select>
          <button type="button" onClick={newConversation} className="inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm hover:bg-muted" title="Cuộc hội thoại mới">
            <Plus className="size-4" /> Mới
          </button>
          <button type="button" onClick={deleteConversation} className="inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm hover:bg-muted" title="Xóa cuộc hội thoại">
            <Trash2 className="size-4" />
          </button>
        </div>

        <div className="flex min-w-[280px] flex-1 items-center gap-2">
          <input
            type="search"
            placeholder="Tìm biểu mẫu (vd: tạm trú, thuế thu nhập)…"
            className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
            value={formSearch}
            onChange={(e) => {
              setFormSearch(e.target.value);
              const q = e.target.value;
              setTimeout(() => {
                loadFormList(q).then(setForms).catch((err) => showToast(String(err instanceof Error ? err.message : err), true));
              }, 350);
            }}
          />
          <select
            className="min-w-[160px] rounded-md border bg-background px-2 py-1.5 text-sm"
            value={formCode}
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

        <div className={`text-sm font-medium ${statusClass}`}>{status}</div>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <section className="flex min-h-0 flex-col gap-3">
          <div className="flex gap-3 rounded-xl border bg-card p-4">
            <button
              type="button"
              disabled={busy || !micAvailable}
              onPointerDown={(e) => { e.preventDefault(); void beginRecording(); }}
              onPointerUp={(e) => { e.preventDefault(); void endRecording(); }}
              onPointerLeave={() => { if (recording) void endRecording(); }}
              className={`flex size-20 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                recording ? "border-primary bg-primary/10 text-primary" : "border-muted-foreground/30 hover:border-primary"
              }`}
              aria-label="Giữ để nói"
            >
              <Mic className="size-8" />
            </button>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              <p className="text-sm text-muted-foreground">
                {micAvailable ? "Giữ để nói · hoặc nhắn tin bên dưới" : "Micro không khả dụng — dùng ô nhắn tin"}
              </p>
              <audio ref={audioRef} className="hidden" />
              {lastAudioFile && (
                <button
                  type="button"
                  className="inline-flex w-fit items-center gap-1 text-sm text-primary hover:underline"
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.src = ttsAudioUrl(lastAudioFile);
                      void audioRef.current.play().catch(() => undefined);
                    }
                  }}
                >
                  <Volume2 className="size-4" /> Nghe lại
                </button>
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
              className="flex gap-2 border-t p-3"
              onSubmit={(e) => {
                e.preventDefault();
                sendText(textInput);
              }}
            >
              <input
                type="text"
                value={textInput}
                disabled={busy}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Nhắn tin cho trợ lý…"
                className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={busy || !textInput.trim()}
                className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-primary-foreground disabled:opacity-50"
              >
                <Send className="size-4" />
              </button>
            </form>
          </div>
        </section>

        <section className="flex min-h-0 flex-col gap-3">
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border bg-card">
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
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => void handleSaveDraft()} disabled={!formCode} className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50">
                    Lưu nháp
                  </button>
                  <button type="button" onClick={() => void handleDownload()} disabled={!formCode || busy} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50">
                    <FileDown className="size-3" /> Tạo & tải tờ khai
                  </button>
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
                        <input
                          type="text"
                          className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm"
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

          <div className="flex min-h-[200px] flex-col rounded-xl border bg-card lg:min-h-0 lg:flex-1">
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
      </div>
    </div>
  );
}