import { proxyGatewayRequest } from "@/lib/server/gateway-proxy";
import { requireAdminPermission } from "@/lib/server/require-admin-session";
import { P } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requireAdminPermission(P.FORMS_READ);
  if (!session.ok) {
    return Response.json({ error: session.error }, { status: session.status });
  }
  return proxyGatewayRequest(req, "/rag/admin/forms", session.session.accessToken);
}

export async function POST(req: Request) {
  const session = await requireAdminPermission(P.FORMS_CREATE);
  if (!session.ok) {
    return Response.json({ error: session.error }, { status: session.status });
  }
  return proxyGatewayRequest(req, "/rag/admin/forms", session.session.accessToken);
}