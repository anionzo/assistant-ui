/** Extract a human-readable message from BFF / idx-api / gateway error JSON. */
export function messageFromErrorPayload(data: unknown, fallback: string): string {
  if (data == null) return fallback;
  if (typeof data === "string") {
    const trimmed = data.trim();
    return trimmed || fallback;
  }
  if (typeof data !== "object") return fallback;

  const obj = data as Record<string, unknown>;

  if (typeof obj.error === "string" && obj.error.trim()) return obj.error.trim();
  if (obj.error && typeof obj.error === "object") {
    const nested = obj.error as Record<string, unknown>;
    if (typeof nested.message === "string" && nested.message.trim()) return nested.message.trim();
    if (typeof nested.detail === "string" && nested.detail.trim()) {
      const code = typeof nested.code === "string" ? nested.code.trim() : "";
      return code ? `${code}: ${nested.detail.trim()}` : nested.detail.trim();
    }
  }
  if (typeof obj.message === "string" && obj.message.trim()) return obj.message.trim();
  if (typeof obj.detail === "string" && obj.detail.trim()) return obj.detail.trim();
  if (obj.detail && typeof obj.detail === "object") {
    const d = obj.detail as Record<string, unknown>;
    if (typeof d.detail === "string" && d.detail.trim()) {
      const code = typeof d.code === "string" ? d.code.trim() : "";
      return code ? `${code}: ${d.detail.trim()}` : d.detail.trim();
    }
    if (typeof d.message === "string" && d.message.trim()) return d.message.trim();
  }

  try {
    return JSON.stringify(data).slice(0, 400);
  } catch {
    return fallback;
  }
}

export function errorMessageFromUnknown(error: unknown, fallback = "Request failed"): string {
  if (error instanceof Error && error.message) {
    // Avoid Error: [object Object] already constructed
    if (error.message === "[object Object]") return fallback;
    return error.message;
  }
  if (typeof error === "string" && error.trim()) return error.trim();
  return messageFromErrorPayload(error, fallback);
}
