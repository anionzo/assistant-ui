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

export async function proxyToGateway(input: ProxyGatewayInput): Promise<Response> {
  let config;
  try {
    config = getGatewayConfig();
  } catch (error) {
    return gatewayErrorResponse(
      error instanceof Error ? error.message : "Gateway configuration invalid",
      500,
      input.requestId,
    );
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
    return gatewayErrorResponse(
      error instanceof Error ? error.message : "Gateway unreachable",
      502,
      input.requestId,
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (upstream.ok && contentType.includes("text/event-stream") && upstream.body) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: ssePassthroughHeaders(upstream, input.requestId),
    });
  }

  const payload = await upstream.text();
  if (!upstream.ok) {
    let message = `Gateway error (${upstream.status})`;
    try {
      const parsed = JSON.parse(payload) as {
        error?: string;
        message?: string;
        detail?: string;
      };
      message = parsed.error ?? parsed.message ?? parsed.detail ?? message;
    } catch {
      if (payload) message = payload.slice(0, 500);
    }
    return gatewayErrorResponse(
      redactGatewayMessage(message, config),
      upstream.status,
      input.requestId,
    );
  }

  const responseHeaders = new Headers();
  if (contentType) responseHeaders.set("Content-Type", contentType);
  responseHeaders.set("X-Request-ID", input.requestId);
  return new Response(payload, { status: upstream.status, headers: responseHeaders });
}