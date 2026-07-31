import { logGatewayEvent } from "../services/ops-log";
import { getGatewayConfig, pickForwardHeaders } from "./config";
import { redactGatewayMessage } from "./redact";

export type GatewayCredential = "user" | "admin";

export type ProxyGatewayInput = {
  upstreamPath: string;
  method: string;
  incomingHeaders: Headers;
  body?: RequestInit["body"];
  signal?: AbortSignal;
  credential: GatewayCredential;
  requestId: string;
};

const SSE_RESPONSE_HEADERS = [
  "cache-control",
  "connection",
  "content-type",
  "x-accel-buffering",
] as const;

function buildUpstreamUrl(gatewayUrl: string, upstreamPath: string): string {
  const normalized = upstreamPath.startsWith("/") ? upstreamPath : `/${upstreamPath}`;
  return `${gatewayUrl}${normalized}`;
}

function ssePassthroughHeaders(upstream: Response, requestId: string): Headers {
  const headers = new Headers();
  for (const name of SSE_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has("content-type")) {
    headers.set("Content-Type", "text/event-stream; charset=utf-8");
  }
  headers.set("Cache-Control", "no-cache, no-transform");
  headers.set("Connection", "keep-alive");
  headers.set("X-Accel-Buffering", "no");
  headers.set("X-Request-ID", requestId);
  return headers;
}

function gatewayErrorResponse(
  message: string,
  status: number,
  requestId: string,
): Response {
  return Response.json(
    {
      success: false,
      requestId,
      error: { code: "GATEWAY_ERROR", message },
    },
    { status, headers: { "X-Request-ID": requestId } },
  );
}

/** Pull a human message out of FastAPI / gateway / ErrorResponse-shaped bodies. */
export function extractGatewayErrorMessage(payload: string, status: number): string {
  const fallback = `Gateway error (${status})`;
  if (!payload?.trim()) return fallback;

  try {
    const parsed = JSON.parse(payload) as unknown;
    const message = readErrorNode(parsed);
    if (message) return message;
  } catch {
    return payload.slice(0, 500);
  }
  return fallback;
}

function readErrorNode(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value !== "object") return null;

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => readErrorNode(item))
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

  // Containers: idx-api { error }, FastAPI { detail: object|array }
  if ("error" in obj) {
    const nested = readErrorNode(obj.error);
    if (nested) return nested;
  }
  if ("detail" in obj && typeof obj.detail === "object") {
    const nested = readErrorNode(obj.detail);
    if (nested) return nested;
  }
  return null;
}

export async function proxyToGateway(input: ProxyGatewayInput): Promise<Response> {
  let config;
  try {
    config = getGatewayConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gateway configuration invalid";
    logGatewayEvent({
      level: "error",
      upstreamPath: input.upstreamPath,
      method: input.method,
      status: 500,
      requestId: input.requestId,
      message: `Gateway config error: ${message}`,
    });
    return gatewayErrorResponse(message, 500, input.requestId);
  }

  const apiKey = input.credential === "user" ? config.userApiKey : config.adminApiKey;
  const url = buildUpstreamUrl(config.gatewayUrl, input.upstreamPath);
  const headers = pickForwardHeaders(input.incomingHeaders);
  headers.set("X-API-Key", apiKey);
  headers.set("X-Request-ID", input.requestId);

  let upstream: Response;
  try {
    const init: RequestInit & { duplex?: "half" } = {
      method: input.method,
      headers,
      cache: "no-store",
      signal: input.signal,
    };
    if (input.body != null) {
      init.body = input.body;
      init.duplex = "half";
    }
    upstream = await fetch(url, init);
  } catch (error) {
    if (input.signal?.aborted) {
      return new Response(null, { status: 499, headers: { "X-Request-ID": input.requestId } });
    }
    const message = error instanceof Error ? error.message : "Gateway unreachable";
    logGatewayEvent({
      level: "error",
      upstreamPath: input.upstreamPath,
      method: input.method,
      status: 502,
      requestId: input.requestId,
      message: `Gateway unreachable: ${message}`,
      detail: url,
    });
    return gatewayErrorResponse(message, 502, input.requestId);
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (upstream.ok && contentType.includes("text/event-stream") && upstream.body) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: ssePassthroughHeaders(upstream, input.requestId),
    });
  }

  const isBinaryBody =
    contentType.includes("application/octet-stream") ||
    contentType.includes("application/vnd.openxmlformats") ||
    contentType.startsWith("audio/") ||
    contentType.startsWith("image/");

  if (upstream.ok && isBinaryBody && upstream.body) {
    const responseHeaders = new Headers();
    if (contentType) responseHeaders.set("Content-Type", contentType);
    for (const name of ["content-length", "content-disposition", "cache-control"] as const) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set("X-Request-ID", input.requestId);
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  }

  const payload = await upstream.text();
  if (!upstream.ok) {
    const message = extractGatewayErrorMessage(payload, upstream.status);
    const redacted = redactGatewayMessage(message, config);
    logGatewayEvent({
      level: upstream.status >= 500 ? "error" : "warn",
      upstreamPath: input.upstreamPath,
      method: input.method,
      status: upstream.status,
      requestId: input.requestId,
      message: `Gateway ${upstream.status}: ${redacted}`,
      detail: payload.slice(0, 400),
    });
    return gatewayErrorResponse(redacted, upstream.status, input.requestId);
  }

  const responseHeaders = new Headers();
  if (contentType) responseHeaders.set("Content-Type", contentType);
  responseHeaders.set("X-Request-ID", input.requestId);
  return new Response(payload, { status: upstream.status, headers: responseHeaders });
}