import { fetchIdxRag } from "@/lib/server/idx-api-rag";

export const VOICE_FORM_SESSION_HEADER = "x-voice-form-session";

export function pickString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string") return value[0].trim();
  return "";
}

export function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

export function voiceFormSessionId(request: Request, bodySessionId?: unknown): string {
  return (
    pickString(request.headers.get(VOICE_FORM_SESSION_HEADER)) ||
    pickString(bodySessionId) ||
    crypto.randomUUID()
  );
}

export function passthroughJsonResponse(
  upstream: Response,
  requestId: string,
  sessionId?: string,
): Response {
  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("X-Request-ID", upstream.headers.get("x-request-id") ?? requestId);
  if (sessionId) headers.set(VOICE_FORM_SESSION_HEADER, sessionId);
  return new Response(upstream.body, { status: upstream.status, headers });
}

export async function proxyUserForms(
  request: Request,
  slug: string[],
  requestId: string,
): Promise<Response> {
  if (slug.some((segment) => segment === ".." || segment.includes("/") || segment.includes("\\"))) {
    return Response.json({ error: "invalid path" }, { status: 400, headers: { "X-Request-ID": requestId } });
  }

  const path = slug.length ? `/rag/forms/${slug.join("/")}` : "/rag/forms";
  const hasBody = !["GET", "HEAD"].includes(request.method.toUpperCase());

  const upstream = await fetchIdxRag({
    path,
    method: request.method,
    pipelineKind: "chat",
    headers: {
      ...(hasBody ? { "Content-Type": request.headers.get("content-type") ?? "application/json" } : {}),
      ...(request.headers.get(VOICE_FORM_SESSION_HEADER)
        ? { [VOICE_FORM_SESSION_HEADER]: request.headers.get(VOICE_FORM_SESSION_HEADER)! }
        : {}),
    },
    body: hasBody ? await request.text() : undefined,
    signal: request.signal,
    requestId,
  });

  return passthroughJsonResponse(upstream, requestId, request.headers.get(VOICE_FORM_SESSION_HEADER) ?? undefined);
}