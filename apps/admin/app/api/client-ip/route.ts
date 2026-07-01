import { NextResponse } from "next/server";
import { isLoopbackIp } from "@/lib/ip-allowlist";
import { fetchPublicIp, resolveClientIp } from "@/lib/server/ip-allowlist";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const connectionIp = resolveClientIp(request.headers);
  const isLocalhost = isLoopbackIp(connectionIp);
  const publicIp = isLocalhost ? await fetchPublicIp() : null;

  return NextResponse.json({
    ip: connectionIp,
    isLocalhost,
    publicIp,
    suggestedIp: isLocalhost ? publicIp ?? connectionIp : connectionIp,
  });
}