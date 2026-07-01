import { errorResponse } from "@/lib/server/errors";
import { proxyUserForms } from "@/lib/server/voice-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ slug?: string[] }> };

async function handle(request: Request, context: RouteContext) {
  const requestId = request.headers.get("X-Request-ID") ?? crypto.randomUUID();
  const { slug } = await context.params;

  try {
    return await proxyUserForms(request, slug ?? [], requestId);
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return errorResponse("Forms gateway is unavailable", "gateway_error", 502, requestId);
  }
}

export const GET = handle;
export const POST = handle;