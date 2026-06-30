import { proxyGatewayRequest } from "@/lib/server/gateway-proxy";
import { requireAdminPermission } from "@/lib/server/require-admin-session";
import { P } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug?: string[] }> };

function permissionForMethod(slug: string[], method: string): number {
  if (slug[0] === "search") return P.FORMS_SEARCH;
  if (method === "DELETE") return P.FORMS_DELETE;
  return P.FORMS_READ;
}

async function handle(req: Request, context: RouteContext) {
  const { slug } = await context.params;
  const segments = slug ?? [];

  // Block path traversal
  if (segments.some((s) => s === ".." || s.includes("/") || s.includes("\\"))) {
    return Response.json({ error: "invalid path" }, { status: 400 });
  }

  const path = segments.join("/");
  const perm = permissionForMethod(segments, req.method);
  const session = await requireAdminPermission(perm);
  if (!session.ok) {
    return Response.json({ error: session.error }, { status: session.status });
  }
  return proxyGatewayRequest(req, `/forms/${path}`);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;