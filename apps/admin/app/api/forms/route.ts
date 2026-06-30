import { proxyGatewayRequest } from "@/lib/server/gateway-proxy";
import { requireAdminSession } from "@/lib/server/require-admin-session";

export const dynamic = "force-dynamic";

async function ensureSession() {
  const session = await requireAdminSession();
  if (!session.ok) {
    return Response.json({ error: session.error }, { status: session.status });
  }
  return null;
}

export async function GET(req: Request) {
  const err = await ensureSession();
  if (err) return err;
  return proxyGatewayRequest(req, "/forms");
}

export async function POST(req: Request) {
  const err = await ensureSession();
  if (err) return err;
  return proxyGatewayRequest(req, "/forms/ingest");
}