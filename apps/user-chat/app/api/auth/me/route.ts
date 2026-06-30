import { NextResponse } from "next/server";
import { getSessionCookie } from "@/lib/auth/cookies";
import { verifySessionToken } from "@/lib/auth/session";
import { getServerConfig } from "@/lib/server/config";

export const runtime = "nodejs";

export async function GET() {
  const token = await getSessionCookie();
  if (!token) {
    return NextResponse.json({ error: "Missing session cookie" }, { status: 401 });
  }

  try {
    const config = getServerConfig();
    const user = await verifySessionToken(token, config.jwtSecret);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Invalid session cookie" }, { status: 401 });
  }
}
