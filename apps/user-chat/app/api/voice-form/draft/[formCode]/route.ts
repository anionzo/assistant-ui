import { errorResponse } from "@/lib/server/errors";
import { fetchIdxRag } from "@/lib/server/idx-api-rag";
import {
  passthroughJsonResponse,
  pickString,
  VOICE_FORM_SESSION_HEADER,
  voiceFormSessionId,
} from "@/lib/server/voice-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ formCode: string }> };

export async function GET(request: Request, context: RouteContext) {
  const requestId = request.headers.get("X-Request-ID") ?? crypto.randomUUID();
  const { formCode: rawCode } = await context.params;
  const formCode = pickString(rawCode);
  if (!formCode) {
    return errorResponse("form_code is required", "validation_error", 400, requestId);
  }

  const sessionId = voiceFormSessionId(request);

  try {
    const upstream = await fetchIdxRag({
      path: `/rag/forms/voice/draft/${encodeURIComponent(formCode)}`,
      method: "GET",
      pipelineKind: "chat",
      headers: { [VOICE_FORM_SESSION_HEADER]: sessionId },
      signal: request.signal,
      requestId,
    });

    return passthroughJsonResponse(upstream, requestId, sessionId);
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return errorResponse("Voice form gateway is unavailable", "gateway_error", 502, requestId);
  }
}