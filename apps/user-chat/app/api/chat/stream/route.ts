import { logBffEvent } from "@/lib/server/bff-log";
import { errorResponse } from "@/lib/server/errors";
import { requireGatewaySession } from "@/lib/server/require-gateway-session";
import { getServerConfig } from "@/lib/server/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BrowserChatRequest = {
  message?: unknown;
  conversationId?: unknown;
  corpusId?: unknown;
  pipeline?: unknown;
  topK?: unknown;
};

export async function POST(request: Request) {
  const requestId = request.headers.get("X-Request-ID") ?? crypto.randomUUID();
  const startedAt = Date.now();

  let body: BrowserChatRequest;
  try {
    body = (await request.json()) as BrowserChatRequest;
  } catch {
    return errorResponse("Request body must be valid JSON", "validation_error", 400, requestId);
  }

  if (typeof body.message !== "string" || !body.message.trim()) {
    return errorResponse("message is required", "validation_error", 400, requestId);
  }
  if (typeof body.conversationId !== "string" || !body.conversationId.trim()) {
    return errorResponse("conversationId is required", "validation_error", 400, requestId);
  }

  const gatewaySession = await requireGatewaySession(body.conversationId, requestId);
  if (!gatewaySession.ok) return gatewaySession.response;

  const { conversationId, userId } = gatewaySession;

  try {
    const config = getServerConfig();
    const corpusId = typeof body.corpusId === "string" ? body.corpusId : config.defaultCorpusId;
    const pipeline = typeof body.pipeline === "string" ? body.pipeline : config.defaultChatPipeline;
    const topK = typeof body.topK === "number" ? body.topK : config.defaultTopK;

    const upstream = await fetch(`${config.gatewayUrl}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "X-API-Key": config.userApiKey,
        "X-Tenant-ID": config.tenantId,
        "X-Corpus-ID": corpusId,
        "X-Chat-Pipeline": pipeline,
        "X-Conversation-ID": conversationId,
        "X-Request-ID": requestId,
      },
      body: JSON.stringify({
        message: body.message.trim(),
        conversation_id: conversationId,
        corpus_id: corpusId,
        pipeline,
        top_k: topK,
      }),
      cache: "no-store",
      signal: request.signal,
    });

    if (!upstream.ok || !upstream.body) {
      logBffEvent({
        level: "error",
        action: "chat.stream",
        request_id: requestId,
        conversation_id: conversationId,
        user_id: userId,
        duration_ms: Date.now() - startedAt,
        status_code: upstream.status,
      });
      const details = await upstream.text().catch(() => undefined);
      return errorResponse("ModularRAG gateway rejected the request", "gateway_error", 502, requestId, details);
    }

    logBffEvent({
      level: "info",
      action: "chat.stream",
      request_id: requestId,
      conversation_id: conversationId,
      user_id: userId,
      duration_ms: Date.now() - startedAt,
      status_code: 200,
    });

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "X-Request-ID": requestId,
      },
    });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    logBffEvent({
      level: "error",
      action: "chat.stream",
      request_id: requestId,
      conversation_id: conversationId,
      user_id: userId,
      duration_ms: Date.now() - startedAt,
      status_code: 502,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return errorResponse("ModularRAG gateway is unavailable", "gateway_error", 502, requestId);
  }
}