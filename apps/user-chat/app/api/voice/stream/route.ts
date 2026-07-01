import { logBffEvent } from "@/lib/server/bff-log";
import { errorResponse } from "@/lib/server/errors";
import {
  fetchIdxRag,
  passthroughSseResponse,
  readIdxRagErrorMessage,
} from "@/lib/server/idx-api-rag";
import { requireGatewaySession } from "@/lib/server/require-gateway-session";
import { getResolvedServerConfig } from "@/lib/server/resolved-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const form = await request.formData().catch(() => null);
    if (!form) {
      return errorResponse("Request must be multipart/form-data", "validation_error", 400, requestId);
    }

    const audioFile = form.get("audio");
    if (!audioFile || !(audioFile instanceof Blob)) {
      return errorResponse("audio field is required", "validation_error", 400, requestId);
    }

    const rawConversationId = form.get("conversation_id");
    if (typeof rawConversationId !== "string" || !rawConversationId.trim()) {
      return errorResponse("conversation_id is required", "validation_error", 400, requestId);
    }

    const gatewaySession = await requireGatewaySession(rawConversationId, requestId);
    if (!gatewaySession.ok) return gatewaySession.response;

    const { conversationId, userId } = gatewaySession;
    const config = await getResolvedServerConfig();
    const corpusId = typeof form.get("corpus_id") === "string" ? (form.get("corpus_id") as string) : config.defaultCorpusId;
    const pipeline = typeof form.get("pipeline") === "string" ? (form.get("pipeline") as string) : config.defaultVoicePipeline;

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const audioBase64 = audioBuffer.toString("base64");

    const upstream = await fetchIdxRag({
      path: "/rag/voice/stream",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "X-Corpus-ID": corpusId,
        "X-Chat-Pipeline": pipeline,
        "X-Conversation-ID": conversationId,
      },
      body: JSON.stringify({
        audio_b64: audioBase64,
        conversation_id: conversationId,
        corpus_id: corpusId,
        pipeline,
      }),
      signal: request.signal,
      requestId,
    });

    if (!upstream.ok || !upstream.body) {
      logBffEvent({
        level: "error",
        action: "voice.stream",
        request_id: requestId,
        conversation_id: conversationId,
        user_id: userId,
        duration_ms: Date.now() - startedAt,
        status_code: upstream.status,
      });
      const details = await readIdxRagErrorMessage(upstream);
      return errorResponse(
        "Voice gateway rejected the request",
        "gateway_error",
        502,
        requestId,
        details,
      );
    }

    logBffEvent({
      level: "info",
      action: "voice.stream",
      request_id: requestId,
      conversation_id: conversationId,
      user_id: userId,
      duration_ms: Date.now() - startedAt,
      status_code: 200,
    });

    return passthroughSseResponse(upstream, requestId);
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    logBffEvent({
      level: "error",
      action: "voice.stream",
      request_id: requestId,
      duration_ms: Date.now() - startedAt,
      status_code: 502,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return errorResponse("Voice gateway is unavailable", "gateway_error", 502, requestId);
  }
}