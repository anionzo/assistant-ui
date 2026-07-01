import { errorResponse } from "@/lib/server/errors";
import { fetchIdxRag } from "@/lib/server/idx-api-rag";
import {
  passthroughJsonResponse,
  pickString,
  safeJsonParse,
  VOICE_FORM_SESSION_HEADER,
  voiceFormSessionId,
} from "@/lib/server/voice-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = request.headers.get("X-Request-ID") ?? crypto.randomUUID();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("Request body must be valid JSON", "validation_error", 400, requestId);
  }

  const formCode = pickString(body.form_code);
  if (!formCode) {
    return errorResponse("form_code is required", "validation_error", 400, requestId);
  }

  const sessionId = voiceFormSessionId(request, body.session_id);
  const payload = {
    form_code: formCode,
    field_values: safeJsonParse(body.field_values, {} as Record<string, unknown>) || {},
    history: safeJsonParse(body.history, [] as Array<{ role: string; text: string }>) || [],
  };

  try {
    const upstream = await fetchIdxRag({
      path: "/rag/forms/voice/draft",
      method: "POST",
      pipelineKind: "chat",
      headers: {
        "Content-Type": "application/json",
        [VOICE_FORM_SESSION_HEADER]: sessionId,
      },
      body: JSON.stringify(payload),
      signal: request.signal,
      requestId,
    });

    return passthroughJsonResponse(upstream, requestId, sessionId);
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return errorResponse("Voice form gateway is unavailable", "gateway_error", 502, requestId);
  }
}