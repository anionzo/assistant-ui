import { errorResponse } from "@/lib/server/errors";
import { fetchIdxRag } from "@/lib/server/idx-api-rag";
import { pickString } from "@/lib/server/voice-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = request.headers.get("X-Request-ID") ?? crypto.randomUUID();
  const fileRaw = new URL(request.url).searchParams.get("file");
  const fileName = pickString(fileRaw?.split(/[\\/]/).pop() ?? "");
  if (!fileName || fileName === "." || fileName === "..") {
    return errorResponse("query parameter 'file' is required", "validation_error", 400, requestId);
  }

  try {
    const upstream = await fetchIdxRag({
      path: `/rag/voice/output/${encodeURIComponent(fileName)}`,
      pipelineKind: "voice",
      requestId,
    });

    if (!upstream.ok) {
      return errorResponse("Voice audio not found", "gateway_error", upstream.status, requestId);
    }

    const audioBuffer = await upstream.arrayBuffer();
    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "audio/wav",
        "Content-Length": String(audioBuffer.byteLength),
        "Cache-Control": "public, max-age=86400",
        "X-Request-ID": upstream.headers.get("x-request-id") ?? requestId,
      },
    });
  } catch {
    return errorResponse("Voice audio gateway unavailable", "gateway_error", 502, requestId);
  }
}