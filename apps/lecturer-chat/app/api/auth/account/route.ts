import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/auth-api-client";
import { clearAuthCookies, getSessionCookie } from "@/lib/auth/cookies";

export async function DELETE() {
  const token = await getSessionCookie();
  if (!token) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const result = await authApiFetch("/auth/account", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  await clearAuthCookies();
  return NextResponse.json({ ok: true });
}