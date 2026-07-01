import type { ConversationStub } from "./types";

export const CONV_KEY = "vf-conversations";
export const ACTIVE_KEY = "vf-active-conv";
export const CONV_CAP = 30;

export function loadConversations(): ConversationStub[] {
  if (typeof window === "undefined") return [];
  let list: ConversationStub[] = [];
  try {
    list = JSON.parse(window.localStorage.getItem(CONV_KEY) || "[]") as ConversationStub[];
  } catch {
    list = [];
  }
  if (!Array.isArray(list)) list = [];
  return list
    .filter((c) => c && typeof c.id === "string" && c.id)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function saveConversations(list: ConversationStub[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONV_KEY, JSON.stringify((list || []).slice(0, CONV_CAP)));
  } catch {
    /* ignore quota */
  }
}

export function getActiveConversationId(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(ACTIVE_KEY) || "";
  } catch {
    return "";
  }
}

export function setActiveConversationId(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function upsertConversation(patch: Partial<ConversationStub> & { id: string }): ConversationStub | null {
  if (!patch.id) return null;
  const list = loadConversations();
  const index = list.findIndex((c) => c.id === patch.id);
  const base =
    index >= 0
      ? list[index]
      : { id: patch.id, formCode: "", formName: "", fieldCount: 0, decision: "" };
  const merged: ConversationStub = { ...base, ...patch, updatedAt: Date.now() };
  if (index >= 0) list.splice(index, 1);
  list.unshift(merged);
  saveConversations(list);
  return merged;
}

export function formatConvLabel(c: ConversationStub): string {
  const name = c.formName || "(chưa chọn biểu mẫu)";
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