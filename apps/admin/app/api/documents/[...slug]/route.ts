import { proxyGatewayRequest } from "@/lib/server/gateway-proxy";
import { requireAdminPermission } from "@/lib/server/require-admin-session";
import { P } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug?: string[] }> };

function permissionForRoute(slug: string[], method: string): number {
  const base = slug[0] ?? "";
  const sub = slug[1] ?? "";
  const action = slug[2] ?? "";

  if (base === "collections") {
    if (!sub) return method === "POST" ? P.COLLECTIONS_CREATE : P.COLLECTIONS_READ;
    if (action === "publish") return P.COLLECTIONS_PUBLISH;
    if (action === "documents") {
      if (slug[4] === "reprocess") return P.DOCUMENTS_REPROCESS;
      if (slug[4] === "chunks") return P.DOCUMENTS_READ;
      return method === "POST" ? P.DOCUMENTS_UPLOAD : P.DOCUMENTS_READ;
    }
    if (action === "files") {
      if (slug[3]) return method === "DELETE" ? P.FILES_DELETE : P.FILES_READ;
      return method === "POST" ? P.DOCUMENTS_UPLOAD : P.FILES_READ;
    }
    return method === "PATCH" ? P.COLLECTIONS_UPDATE
      : method === "DELETE" ? P.COLLECTIONS_DELETE
      : P.COLLECTIONS_READ;
  }

  if (base === "chunks") return P.DOCUMENTS_READ;
  return P.COLLECTIONS_READ;
}

async function handle(req: Request, context: RouteContext) {
  const { slug } = await context.params;
  const segments = slug ?? [];

  // Block path traversal
  if (segments.some((s) => s === ".." || s.includes("/") || s.includes("\\"))) {
    return Response.json({ error: "invalid path" }, { status: 400 });
  }

  const path = segments.join("/");
  const perm = permissionForRoute(segments, req.method);
  const session = await requireAdminPermission(perm);
  if (!session.ok) {
    return Response.json({ error: session.error }, { status: session.status });
  }
  return proxyGatewayRequest(req, `/rag/admin/documents/${path}`, session.session.accessToken);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;