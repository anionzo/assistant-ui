import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth/session-resolve";

export const runtime = "nodejs";

export async function GET() {
  const session = await resolveSession();
  if (!session) {
    return NextResponse.json({ error: "Missing session cookie" }, { status: 401 });
  }

  return NextResponse.json({ user: session.user });
}