import { requireAdminPermission } from "@/lib/server/require-admin-session";
import { P } from "@/lib/auth/permissions";
import { getAdminConfig } from "@/lib/server/config";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug?: string[] }> };

function permissionFor(path: string, method: string): number | null {
  if (path === "users" || path.startsWith("users/")) {
    const rest = path.slice(6);
    if (!rest) return method === "GET" ? P.USERS_LIST : P.USERS_UPDATE;
    if (rest.endsWith("/ban")) return P.USERS_BAN;
    if (rest.endsWith("/reset-password")) return P.USERS_RESET_PASSWORD;
    if (rest.endsWith("/force-logout")) return P.USERS_FORCE_LOGOUT;
    if (rest.endsWith("/roles")) return P.USERS_ASSIGN_ROLES;
    if (method === "DELETE") return P.USERS_DELETE;
    if (method === "PATCH") return P.USERS_UPDATE;
    return P.USERS_READ;
  }
  if (path.startsWith("roles/")) {
    if (path.endsWith("/permissions")) {
      return method === "GET" ? P.USERS_READ : P.USERS_ASSIGN_ROLES;
    }
    return P.USERS_READ;
  }
  if (path === "roles" || path === "permissions") return P.USERS_READ;
  if (path === "stats") return P.USERS_LIST;
  return null;
}

async function handle(req: Request, context: RouteContext) {
  const { slug } = await context.params;
  const path = (slug ?? []).join("/");
  const perm = permissionFor(path, req.method);
  if (perm === null) {
    return Response.json({ error: "unknown admin route" }, { status: 400 });
  }

  const session = await requireAdminPermission(perm);
  if (!session.ok) {
    return Response.json({ error: session.error }, { status: session.status });
  }

  const { authApiUrl } = getAdminConfig();
  const upstream = `${authApiUrl}/admin/${path}`;

  const body = req.method === "GET" || req.method === "HEAD"
    ? undefined
    : await req.text().catch(() => undefined);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.session.accessToken}`,
    "Content-Type": req.headers.get("content-type") ?? "application/json",
  };

  const response = await fetch(upstream, {
    method: req.method,
    headers,
    body,
    cache: "no-store",
  });

  const payload = await response.text();

  let bodyJson: unknown;
  try { bodyJson = JSON.parse(payload); } catch { bodyJson = null; }

  if (
    bodyJson &&
    typeof bodyJson === "object" &&
    "success" in (bodyJson as Record<string, unknown>) &&
    "data" in (bodyJson as Record<string, unknown>)
  ) {
    const stripped = JSON.stringify((bodyJson as Record<string, unknown>).data);
    return new Response(stripped, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(payload, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
