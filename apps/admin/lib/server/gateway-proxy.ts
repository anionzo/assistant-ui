import { getAdminConfig } from "@/lib/server/config";
import { errorResponse } from "@/lib/server/errors";

const FORWARDED_HEADERS = ["content-type", "accept", "accept-language"];

function buildUpstreamUrl(gatewayUrl: string, upstreamPath: string, req: Request) {
  const normalized = upstreamPath.startsWith("/") ? upstreamPath : `/${upstreamPath}`;
  const url = new URL(`${gatewayUrl}${normalized}`);
  const incoming = new URL(req.url);
  incoming.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

function pickForwardHeaders(req: Request, requestId: string): HeadersInit {
  const headers: Record<string, string> = {
    "X-API-Key": getAdminConfig().adminApiKey,
    "X-Request-ID": requestId,
  };
  for (const name of FORWARDED_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers[name] = value;
  }
  return headers;
}

async function readBody(req: Request): Promise<BodyInit | undefined> {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    return req.body ?? undefined;
  }
  const text = await req.text();
  return text.length > 0 ? text : undefined;
}

export async function proxyGatewayRequest(
  req: Request,
  upstreamPath: string,
  requestId = crypto.randomUUID(),
) {
  let config;
  try {
    config = getAdminConfig();
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Invalid admin configuration",
      "configuration_error",
      500,
      requestId,
    );
  }

  const url = buildUpstreamUrl(config.gatewayUrl, upstreamPath, req);
  const headers = pickForwardHeaders(req, requestId);

  let body: BodyInit | undefined;
  try {
    body = await readBody(req);
  } catch {
    return errorResponse("Failed to read request body", "validation_error", 400, requestId);
  }

  let upstream: Response;
  try {
    const init: RequestInit & { duplex?: "half" } = {
      method: req.method,
      headers,
      body,
      cache: "no-store",
    };
    if (body) init.duplex = "half";
    upstream = await fetch(url, init);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Gateway unreachable",
      "gateway_error",
      502,
      requestId,
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "application/json";
  const payload = await upstream.text();

  if (!upstream.ok) {
    const hint =
      upstream.status === 404
        ? " — check MODULAR_RAG_GATEWAY_URL (gateway not on localhost?)"
        : upstream.status === 403
          ? " — check ADMIN_API_KEY"
          : "";
    try {
      const parsed = JSON.parse(payload) as { error?: string; message?: string; detail?: string };
      return errorResponse(
        (parsed.error ?? parsed.message ?? parsed.detail ?? `Gateway error (${upstream.status})`) + hint,
        "gateway_error",
        upstream.status,
        requestId,
        { upstream: url.replace(config.adminApiKey, "***"), ...parsed },
      );
    } catch {
      return errorResponse(
        (payload || `Gateway error (${upstream.status})`) + hint,
        "gateway_error",
        upstream.status,
        requestId,
        { upstream: url.replace(config.adminApiKey, "***") },
      );
    }
  }

  return new Response(payload, {
    status: upstream.status,
    headers: {
      "Content-Type": contentType,
      "X-Request-ID": requestId,
    },
  });
}