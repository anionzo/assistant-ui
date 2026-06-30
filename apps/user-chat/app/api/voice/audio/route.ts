import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/server/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get("ref");
  if (!ref) {
    return NextResponse.json({ error: "ref query parameter is required" }, { status: 400 });
  }

  try {
    const config = getServerConfig();
    const upstream = await fetch(`${config.gatewayUrl}/voice/audio?ref=${encodeURIComponent(ref)}`, {
      headers: {
        "X-API-Key": config.userApiKey,
        "X-Tenant-ID": config.tenantId,
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: "Audio ref not found" }, { status: upstream.status });
    }

    const audioBuffer = await upstream.arrayBuffer();
    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "audio/webm",
        "Content-Length": String(audioBuffer.byteLength),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Voice audio gateway unavailable" }, { status: 502 });
  }
}
