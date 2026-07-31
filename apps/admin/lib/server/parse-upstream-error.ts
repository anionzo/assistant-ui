/**
 * Normalize error payloads from idx-api / ModularRAG gateway / FastAPI.
 * Gateway often returns `{ detail: string | ErrorResponse | ValidationError[] }`.
 * idx-api wraps as `{ success: false, error: { code, message } }`.
 */
export function parseUpstreamErrorMessage(payload: string, status: number): string {
  const fallback = `Gateway error (${status})`;
  if (!payload?.trim()) return fallback;

  try {
    const parsed = JSON.parse(payload) as unknown;
    const message = extractErrorMessage(parsed);
    if (message) return message;
  } catch {
    return payload.slice(0, 500);
  }

  return fallback;
}

export function extractErrorMessage(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value !== "object") return null;

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => extractErrorMessage(item))
      .filter((part): part is string => Boolean(part));
    return parts.length > 0 ? parts.join("; ") : null;
  }

  const obj = value as Record<string, unknown>;

  // Leaf ErrorResponse / FastAPI validation item on this node.
  if (typeof obj.detail === "string" && obj.detail.trim()) {
    const code = typeof obj.code === "string" ? obj.code.trim() : "";
    return code ? `${code}: ${obj.detail.trim()}` : obj.detail.trim();
  }
  if (typeof obj.message === "string" && obj.message.trim()) {
    return obj.message.trim();
  }
  if (typeof obj.msg === "string" && obj.msg.trim()) {
    const loc = Array.isArray(obj.loc) ? obj.loc.map(String).join(".") : "";
    return loc ? `${loc}: ${obj.msg.trim()}` : obj.msg.trim();
  }

  // Containers: idx-api { error: ... }, FastAPI { detail: object|array }
  if ("error" in obj) {
    const nested = extractErrorMessage(obj.error);
    if (nested) return nested;
  }
  if ("detail" in obj && typeof obj.detail === "object") {
    const nested = extractErrorMessage(obj.detail);
    if (nested) return nested;
  }

  return null;
}
