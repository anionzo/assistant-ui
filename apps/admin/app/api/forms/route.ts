import { proxyGatewayRequest } from "@/lib/server/gateway-proxy";
import { requireAdminPermission } from "@/lib/server/require-admin-session";
import { P } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

async function ensurePermission(perm: number) {
  const session = await requireAdminPermission(perm);
  if (!session.ok) {
    return Response.json({ error: session.error }, { status: session.status });
  }
  return null;
}

export async function GET(req: Request) {
  const err = await ensurePermission(P.FORMS_READ);
  if (err) return err;
  return proxyGatewayRequest(req, "/forms");
}

export async function POST(req: Request) {
  const err = await ensurePermission(P.FORMS_CREATE);
  if (err) return err;
  return proxyGatewayRequest(req, "/forms/ingest");
}