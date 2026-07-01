import { NextResponse } from "next/server";
import { resolveSession } from "@/lib/auth/session-resolve";

export const runtime = "nodejs";

export async function GET() {
  const session = await resolveSession();
  if (!session) {
    return NextResponse.json({ error: "Missing session cookie" }, { status: 401 });
  }

  const response = NextResponse.json({ user: session.user });
  if (session.refreshed) {
    // resolveSession already set cookies via cookies().set()
    // Still attach explicitly for safety
  }
  return response;
}