export type BffError = {
  error: string | { message?: string; code?: string; detail?: string };
  code?: string;
  requestId?: string;
  details?: unknown;
  message?: string;
  detail?: unknown;
};

export class BffRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;

  constructor(message: string, status: number, opts?: { code?: string; requestId?: string }) {
    super(message);
    this.name = "BffRequestError";
    this.status = status;
    this.code = opts?.code;
    this.requestId = opts?.requestId;
  }
}

function extractMessage(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value !== "object") return null;
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => extractMessage(item))
      .filter((part): part is string => Boolean(part));
    return parts.length > 0 ? parts.join("; ") : null;
  }
  const obj = value as Record<string, unknown>;

  // Leaf ErrorResponse / validation item
  if (typeof obj.detail === "string" && obj.detail.trim()) {
    const code = typeof obj.code === "string" ? obj.code.trim() : "";
    return code ? `${code}: ${obj.detail.trim()}` : obj.detail.trim();
  }
  if (typeof obj.message === "string" && obj.message.trim()) return obj.message.trim();
  if (typeof obj.msg === "string" && obj.msg.trim()) {
    const loc = Array.isArray(obj.loc) ? obj.loc.map(String).join(".") : "";
    return loc ? `${loc}: ${obj.msg.trim()}` : obj.msg.trim();
  }

  // Containers
  if ("error" in obj) {
    const nested = extractMessage(obj.error);
    if (nested) return nested;
  }
  if ("detail" in obj && typeof obj.detail === "object") {
    const nested = extractMessage(obj.detail);
    if (nested) return nested;
  }
  return null;
}

export function errorMessageFromPayload(data: unknown, status: number): string {
  const fromPayload = extractMessage(data);
  if (fromPayload) return fromPayload;
  if (data && typeof data === "object" && typeof (data as { raw?: unknown }).raw === "string") {
    const raw = String((data as { raw: string }).raw).trim();
    if (raw) return raw.slice(0, 500);
  }
  return `Request failed (${status})`;
}

export function requestIdFromPayload(data: unknown, response: Response): string | undefined {
  if (data && typeof data === "object") {
    const rid = (data as { requestId?: unknown }).requestId;
    if (typeof rid === "string" && rid.trim()) return rid.trim();
  }
  const header = response.headers.get("x-request-id") ?? response.headers.get("X-Request-ID");
  return header?.trim() || undefined;
}

export async function bffJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const err = (data ?? {}) as BffError;
    const message = errorMessageFromPayload(data, response.status);
    const code = typeof err.code === "string"
      ? err.code
      : err.error && typeof err.error === "object" && typeof err.error.code === "string"
        ? err.error.code
        : undefined;
    throw new BffRequestError(message, response.status, {
      code,
      requestId: requestIdFromPayload(data, response),
    });
  }

  return data as T;
}

export function asArray<T>(payload: unknown, keys: string[]): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    for (const key of keys) {
      const value = (payload as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
}

/** Format BFF/gateway errors for operator UI (message + status + request id). */
export function formatBffError(
  error: unknown,
  fallback = "Request failed",
): { message: string; status?: number; requestId?: string; code?: string } {
  if (error instanceof BffRequestError) {
    return {
      message: error.message || fallback,
      status: error.status,
      requestId: error.requestId,
      code: error.code,
    };
  }
  if (error instanceof Error) {
    return { message: error.message || fallback };
  }
  return { message: fallback };
}
