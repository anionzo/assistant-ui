import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/auth-api-client";
import { getSessionCookie } from "@/lib/auth/cookies";

type MeResponse = {
  user: { id: string; email: string; displayName: string | null; avatarUrl: string | null };
  roles: Array<{ id: number; name: string }>;
  permissions: string[];
};

export async function GET() {
  const token = await getSessionCookie();
  if (!token) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const result = await authApiFetch<MeResponse>("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
