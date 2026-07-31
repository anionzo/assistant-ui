import { getAdminConfig } from "@/lib/server/config";
import { errorResponse } from "@/lib/server/errors";
import { parseUpstreamErrorMessage } from "@/lib/server/parse-upstream-error";

const FORWARDED_HEADERS = ["content-type", "accept", "accept-language"];
export const IDX_SERVICE_AUTH_HEADER = "x-idx-service-token";

function buildIdxRagUrl(idxApiUrl: string, ragPath: string, req: Request) {
  const normalized = ragPath.startsWith("/") ? ragPath : `/${ragPath}`;
  const url = new URL(`${idxApiUrl.replace(/\/$/, "")}${normalized}`);
  const incoming = new URL(req.url);
  incoming.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

function pickForwardHeaders(
  req: Request,
  requestId: string,
  accessToken: string,
): HeadersInit {
  const config = getAdminConfig();
  const headers: Record<string, string> = {
    [IDX_SERVICE_AUTH_HEADER]: config.idxServiceSecret,
    Authorization: `Bearer ${accessToken}`,
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
    // Stream multipart as-is (keep boundary in content-type).
    return req.body ?? undefined;
  }
  const text = await req.text();
  return text.length > 0 ? text : undefined;
}

export async function proxyGatewayRequest(
  req: Request,
  ragPath: string,
  accessToken: string,
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

  const url = buildIdxRagUrl(config.idxApiUrl, ragPath, req);
  const headers = pickForwardHeaders(req, requestId, accessToken);

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
    return errorResponse(
      parseUpstreamErrorMessage(payload, upstream.status),
      "gateway_error",
      upstream.status,
      requestId,
    );
  }

  return new Response(payload, {
    status: upstream.status,
    headers: {
      "Content-Type": contentType,
      "X-Request-ID": requestId,
    },
  });
}