import { proxyGatewayRequest } from "@/lib/server/gateway-proxy";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug?: string[] }> };

async function handle(req: Request, context: RouteContext) {
  const { slug } = await context.params;
  const path = (slug ?? []).join("/");
  return proxyGatewayRequest(req, `/document-processing/compat/${path}`);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;