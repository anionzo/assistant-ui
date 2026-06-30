import { errorResponse } from "@/lib/server/errors";
import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/server/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const form = await request.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ error: "Request must be multipart/form-data" }, { status: 400 });
    }

    const audioFile = form.get("audio");
    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json({ error: "audio field is required" }, { status: 400 });
    }

    const conversationId = form.get("conversation_id");
    if (typeof conversationId !== "string" || !conversationId.trim()) {
      return NextResponse.json({ error: "conversation_id is required" }, { status: 400 });
    }

    const config = getServerConfig();
    const corpusId = typeof form.get("corpus_id") === "string" ? (form.get("corpus_id") as string) : config.defaultCorpusId;
    const pipeline = typeof form.get("pipeline") === "string" ? (form.get("pipeline") as string) : config.defaultVoicePipeline;

    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const audioBase64 = audioBuffer.toString("base64");

    const upstream = await fetch(`${config.gatewayUrl}/voice/chat/stream`, {
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
        audio_b64: audioBase64,
        conversation_id: conversationId,
        corpus_id: corpusId,
        pipeline,
      }),
      cache: "no-store",
      signal: request.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const details = await upstream.text().catch(() => undefined);
      console.error(
        JSON.stringify({
          level: "error",
          action: "voice.stream",
          request_id: requestId,
          conversation_id: conversationId,
          duration_ms: Date.now() - startedAt,
          status_code: upstream.status,
        }),
      );
      return errorResponse(
        "Voice gateway rejected the request",
        "gateway_error",
        502,
        requestId,
        details,
      );
    }

    console.info(
      JSON.stringify({
        level: "info",
        action: "voice.stream",
        request_id: requestId,
        conversation_id: conversationId,
        duration_ms: Date.now() - startedAt,
        status_code: 200,
      }),
    );

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
    console.error(
      JSON.stringify({
        level: "error",
        action: "voice.stream",
        request_id: requestId,
        duration_ms: Date.now() - startedAt,
        status_code: 502,
        error: error instanceof Error ? error.name : "UnknownError",
      }),
    );
    return errorResponse("Voice gateway is unavailable", "gateway_error", 502, requestId);
  }
}
