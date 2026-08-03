import { errorResponse } from "@/lib/server/errors";
import { fetchIdxRag, readIdxRagErrorMessage } from "@/lib/server/idx-api-rag";
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Request body must be multipart form data", "validation_error", 400, requestId);
  }

  const audioEntry = formData.get("audio");
  const hasAudio =
    audioEntry instanceof Blob && audioEntry.size > 0;
  const userText = pickString(formData.get("text"));
  if (!hasAudio && !userText) {
    return errorResponse("audio file (field 'audio') or text is required", "validation_error", 400, requestId);
  }

  const formCode = pickString(formData.get("form_code"));
  const sessionId = voiceFormSessionId(request, formData.get("session_id"));
  let fieldValues = safeJsonParse(formData.get("field_values"), {} as Record<string, unknown>);
  if (!fieldValues || typeof fieldValues !== "object" || Array.isArray(fieldValues)) {
    fieldValues = {};
  }
  let history = safeJsonParse(formData.get("history"), [] as Array<{ role: string; text: string }>);
  if (!Array.isArray(history)) history = [];
  const voiceName = pickString(formData.get("voice_name"));

  let audioB64: string | undefined;
  let filename: string | undefined;
  if (hasAudio && audioEntry instanceof Blob) {
    const buffer = Buffer.from(await audioEntry.arrayBuffer());
    audioB64 = buffer.toString("base64");
    filename = "utterance.wav";
  }

  const payload = {
    ...(audioB64 ? { audio_b64: audioB64, filename } : { text: userText }),
    ...(formCode ? { form_code: formCode } : {}),
    session_id: sessionId,
    field_values: fieldValues,
    history,
    ...(voiceName ? { voice_name: voiceName } : {}),
  };

  try {
    const upstream = await fetchIdxRag({
      path: "/rag/forms/voice/fill",
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

    if (!upstream.ok) {
      // Clone not needed: we only read body when erroring (don't passthrough).
      const message =
        (await readIdxRagErrorMessage(upstream)) ??
        `Voice form fill failed (gateway HTTP ${upstream.status})`;
      return errorResponse(message, "gateway_error", upstream.status, requestId);
    }

    return passthroughJsonResponse(upstream, requestId, sessionId);
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    const detail = error instanceof Error ? error.message : "unknown error";
    return errorResponse(
      `Voice form gateway is unavailable: ${detail}`,
      "gateway_error",
      502,
      requestId,
    );
  }
}