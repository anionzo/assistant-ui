import type { FillResponse, FormSchema, FormSummary } from "./types";

export const VOICE_FORM_SESSION_HEADER = "x-voice-form-session";

function sessionHeaders(sessionId: string): Record<string, string> {
  return sessionId ? { [VOICE_FORM_SESSION_HEADER]: sessionId } : {};
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: T | null = null;
  try {
    data = text ? (JSON.parse(text) as T) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = data as { error?: string; message?: string } | null;
    const msg = err?.error || err?.message || `HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data as T;
}

const PROXY = "/api/voice-form/proxy";

export async function loadFormList(query?: string): Promise<FormSummary[]> {
  let data: { forms?: FormSummary[] };
  if (query?.trim()) {
    data = await apiJson(`${PROXY}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query.trim(), top_k: 15 }),
    });
  } else {
    data = await apiJson(PROXY, { method: "GET" });
  }
  const list = data.forms ?? [];
  return list.map((f) => ({
    form_code: f.form_code,
    form_name: f.form_name || f.form_code,
  }));
}

export async function loadFormDetail(code: string): Promise<{ form_schema?: FormSchema }> {
  return apiJson(`${PROXY}/${encodeURIComponent(code)}`, { method: "GET" });
}

export async function postFill(
  sessionId: string,
  extra: Record<string, string | Blob>,
): Promise<FillResponse> {
  const fd = new FormData();
  fd.append("session_id", sessionId);
  for (const [k, v] of Object.entries(extra)) {
    if (v instanceof Blob) fd.append(k, v, "utterance.wav");
    else fd.append(k, v);
  }
  const res = await fetch("/api/voice-form/fill", {
    method: "POST",
    headers: sessionHeaders(sessionId),
    body: fd,
  });
  const text = await res.text();
  let data: FillResponse | null = null;
  try {
    data = text ? (JSON.parse(text) as FillResponse) : null;
  } catch {
    data = null;
  }
  if (!res.ok || !data) {
    const err = data as { error?: string } | null;
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  return data;
}

export async function renderPreview(
  formCode: string,
  fieldValues: Record<string, unknown>,
  sessionId: string,
): Promise<{ html?: string; output_file?: string }> {
  return apiJson(`${PROXY}/render_preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeaders(sessionId) },
    body: JSON.stringify({ form_code: formCode, field_values: fieldValues }),
  });
}

export async function renderDocx(
  formCode: string,
  fieldValues: Record<string, unknown>,
  sessionId: string,
): Promise<{ output_file?: string; file_path?: string }> {
  return apiJson(`${PROXY}/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeaders(sessionId) },
    body: JSON.stringify({ form_code: formCode, field_values: fieldValues }),
  });
}

export function outputDownloadUrl(file: string): string {
  return `${PROXY}/output/${encodeURIComponent(file)}`;
}

export function ttsAudioUrl(file: string): string {
  return `/api/voice-form/audio?file=${encodeURIComponent(file)}`;
}