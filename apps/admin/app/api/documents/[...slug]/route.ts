import { proxyGatewayRequest } from "@/lib/server/gateway-proxy";
import { requireAdminSession } from "@/lib/server/require-admin-session";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug?: string[] }> };

async function handle(req: Request, context: RouteContext) {
  const session = await requireAdminSession();
  if (!session.ok) {
    return Response.json({ error: session.error }, { status: session.status });
  }
  const { slug } = await context.params;
  const path = (slug ?? []).join("/");
  return proxyGatewayRequest(req, `/document-processing/compat/${path}`);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;