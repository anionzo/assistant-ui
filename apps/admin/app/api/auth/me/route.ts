import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/auth-api-client";
import { resolveSession } from "@/lib/auth/session-resolve";

type MeResponse = {
  user: { id: string; email: string; displayName: string | null; avatarUrl: string | null };
  roles: Array<{ id: number; name: string }>;
  permissions: string[];
};

export async function GET() {
  const session = await resolveSession();
  if (!session) {
    return NextResponse.json({ error: "Missing session cookie" }, { status: 401 });
  }

  // Use the (possibly refreshed) token to fetch full user profile
  const result = await authApiFetch<MeResponse>("/auth/me", {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
