import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/auth-api-client";
import { resolveSession } from "@/lib/auth/session-resolve";

export const runtime = "nodejs";

export async function GET() {
  const session = await resolveSession();
  if (!session) {
    return NextResponse.json({ error: "Missing session cookie" }, { status: 401 });
  }

  const profile = await authApiFetch<{
    user: {
      id: string;
      email: string;
      displayName: string | null;
      avatarUrl: string | null;
      hasPassword?: boolean;
    };
  }>("/auth/me", {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (profile.ok) {
    return NextResponse.json({ user: profile.data.user });
  }

  return NextResponse.json({ user: session.user });
}