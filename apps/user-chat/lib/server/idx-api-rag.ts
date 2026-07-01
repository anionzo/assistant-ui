import { getServerConfig } from "@/lib/server/config";

export const IDX_SERVICE_AUTH_HEADER = "x-idx-service-token";

type FetchIdxRagOptions = {
  path: string;
  method?: string;
  body?: RequestInit["body"];
  headers?: Record<string, string>;
  signal?: AbortSignal;
  requestId: string;
};

export function idxRagUrl(path: string) {
  const config = getServerConfig();
  const base = config.idxApiUrl.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function idxRagHeaders(requestId: string, extra: Record<string, string> = {}) {
  const config = getServerConfig();
  return {
    [IDX_SERVICE_AUTH_HEADER]: config.idxServiceSecret,
    "X-Request-ID": requestId,
    "X-Tenant-ID": config.tenantId,
    ...extra,
  };
}

export async function fetchIdxRag(options: FetchIdxRagOptions) {
  return fetch(idxRagUrl(options.path), {
    method: options.method ?? "GET",
    headers: idxRagHeaders(options.requestId, options.headers),
    body: options.body,
    signal: options.signal,
    cache: "no-store",
  });
}

export async function readIdxRagErrorMessage(response: Response): Promise<string | undefined> {
  const payload = (await response.json().catch(() => null)) as {
    error?: string | { message?: string };
  } | null;
  if (!payload?.error) return undefined;
  if (typeof payload.error === "string") return payload.error;
  return payload.error.message;
}

export function passthroughSseResponse(upstream: Response, requestId: string): Response {
  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("Cache-Control", "no-cache, no-transform");
  headers.set("Connection", "keep-alive");
  headers.set("X-Accel-Buffering", "no");
  headers.set("X-Request-ID", upstream.headers.get("x-request-id") ?? requestId);
  return new Response(upstream.body, { status: upstream.status, headers });
}