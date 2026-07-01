import type { ConversationStub } from "./types";

export type VoiceFormSessionRecord = ConversationStub & {
  fieldValues?: Record<string, unknown>;
  history?: Array<{ role: string; text: string }>;
};

type SessionApiShape = {
  id: string;
  title?: string;
  formCode: string;
  formName: string;
  fieldCount: number;
  decision: string;
  updatedAt: string;
  fieldValues?: Record<string, unknown>;
  history?: Array<{ role: string; text: string }>;
};

async function sessionJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: T | null = null;
  try {
    data = text ? (JSON.parse(text) as T) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = data as { error?: string } | null;
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  return data as T;
}

export function toConversationStub(session: SessionApiShape): ConversationStub {
  return {
    id: session.id,
    title: session.title ?? "",
    formCode: session.formCode,
    formName: session.formName,
    fieldCount: session.fieldCount,
    decision: session.decision,
    updatedAt: new Date(session.updatedAt).getTime(),
  };
}

export function toSessionRecord(session: SessionApiShape): VoiceFormSessionRecord {
  return {
    ...toConversationStub(session),
    fieldValues: session.fieldValues ?? {},
    history: session.history ?? [],
  };
}

export function formatConvLabel(c: ConversationStub): string {
  const name = c.title?.trim() || c.formName || "(chưa chọn biểu mẫu)";
  const d = c.updatedAt ? new Date(c.updatedAt) : null;
  let time = "";
  if (d) {
    const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    time = d.toDateString() === new Date().toDateString()
      ? hm
      : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${hm}`;
  }
  const n = c.fieldCount ? ` · ${c.fieldCount} mục` : "";
  const done = c.decision === "ready" || c.decision === "confirm" ? " ✓" : "";
  return `${name}${time ? ` · ${time}` : ""}${n}${done}`;
}

/** List summaries only — no history/fieldValues (load detail on activate). */
export async function listSessions(): Promise<ConversationStub[]> {
  const data = await sessionJson<{ sessions: SessionApiShape[] }>(
    "/api/voice-form/sessions",
    { method: "GET" },
  );
  return (data.sessions ?? []).map(toConversationStub);
}

export async function createSession(): Promise<VoiceFormSessionRecord> {
  const data = await sessionJson<{ session: SessionApiShape }>(
    "/api/voice-form/sessions",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) },
  );
  return toSessionRecord(data.session);
}

export async function loadSession(id: string): Promise<VoiceFormSessionRecord> {
  const data = await sessionJson<{ session: SessionApiShape }>(
    `/api/voice-form/sessions/${encodeURIComponent(id)}`,
    { method: "GET" },
  );
  return toSessionRecord(data.session);
}

export async function saveSessionState(input: {
  id: string;
  formCode?: string;
  formName?: string;
  fieldValues: Record<string, unknown>;
  history: Array<{ role: string; text: string }>;
  decision: string;
}): Promise<VoiceFormSessionRecord> {
  const data = await sessionJson<{ session: SessionApiShape }>(
    `/api/voice-form/sessions/${encodeURIComponent(input.id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formCode: input.formCode,
        formName: input.formName,
        fieldValues: input.fieldValues,
        history: input.history,
        decision: input.decision,
      }),
    },
  );
  return toSessionRecord(data.session);
}

export async function renameSession(id: string, title: string): Promise<VoiceFormSessionRecord> {
  const data = await sessionJson<{ session: SessionApiShape }>(
    `/api/voice-form/sessions/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    },
  );
  return toSessionRecord(data.session);
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`/api/voice-form/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    let err = `HTTP ${res.status}`;
    try {
      const data = JSON.parse(text) as { error?: string };
      if (data.error) err = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(err);
  }
}