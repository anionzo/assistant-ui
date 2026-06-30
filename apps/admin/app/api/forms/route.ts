import { proxyGatewayRequest } from "@/lib/server/gateway-proxy";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return proxyGatewayRequest(req, "/forms");
}

export async function POST(req: Request) {
  return proxyGatewayRequest(req, "/forms/ingest");
}