import { getServerConfig } from "@/lib/server/config";
import { getResolvedServerConfig } from "@/lib/server/resolved-config";

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

export async function idxRagHeaders(requestId: string, extra: Record<string, string> = {}) {
  const config = await getResolvedServerConfig();
  return {
    [IDX_SERVICE_AUTH_HEADER]: config.idxServiceSecret,
    "X-Request-ID": requestId,
    "X-Tenant-ID": config.tenantId,
    ...extra,
  };
}

/** Runtime headers from MongoDB app_config (same source as /api/config). */
export async function idxRagRuntimeHeaders(
  requestId: string,
  extra: Record<string, string> = {},
  pipelineKind: "chat" | "voice" = "chat",
) {
  const config = await getResolvedServerConfig();
  const pipeline =
    pipelineKind === "voice" ? config.defaultVoicePipeline : config.defaultChatPipeline;
  return idxRagHeaders(requestId, {
    "X-Corpus-ID": config.defaultCorpusId,
    "X-Chat-Pipeline": pipeline,
    ...extra,
  });
}

type FetchIdxRagOptionsWithRuntime = FetchIdxRagOptions & {
  pipelineKind?: "chat" | "voice";
};

export async function fetchIdxRag(options: FetchIdxRagOptionsWithRuntime) {
  const headerFn = options.pipelineKind
    ? () => idxRagRuntimeHeaders(options.requestId, options.headers, options.pipelineKind)
    : () => idxRagHeaders(options.requestId, options.headers);

  return fetch(idxRagUrl(options.path), {
    method: options.method ?? "GET",
    headers: await headerFn(),
    body: options.body,
    signal: options.signal,
    cache: "no-store",
  });
}

export async function readIdxRagErrorMessage(response: Response): Promise<string | undefined> {
  const payload = (await response.json().catch(() => null)) as {
    error?: string | { message?: string; detail?: string; code?: string };
    message?: string;
    detail?: string | { detail?: string; message?: string; code?: string };
  } | null;
  if (!payload) return undefined;

  if (typeof payload.error === "string" && payload.error.trim()) return payload.error.trim();
  if (payload.error && typeof payload.error === "object") {
    if (typeof payload.error.message === "string" && payload.error.message.trim()) {
      return payload.error.message.trim();
    }
    if (typeof payload.error.detail === "string" && payload.error.detail.trim()) {
      const code = typeof payload.error.code === "string" ? payload.error.code.trim() : "";
      return code ? `${code}: ${payload.error.detail.trim()}` : payload.error.detail.trim();
    }
  }
  if (typeof payload.message === "string" && payload.message.trim()) return payload.message.trim();
  if (typeof payload.detail === "string" && payload.detail.trim()) return payload.detail.trim();
  if (payload.detail && typeof payload.detail === "object") {
    if (typeof payload.detail.detail === "string" && payload.detail.detail.trim()) {
      const code = typeof payload.detail.code === "string" ? payload.detail.code.trim() : "";
      return code ? `${code}: ${payload.detail.detail.trim()}` : payload.detail.detail.trim();
    }
    if (typeof payload.detail.message === "string" && payload.detail.message.trim()) {
      return payload.detail.message.trim();
    }
  }
  return undefined;
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