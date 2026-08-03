import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/auth-api-client";
import { clearAuthCookies, getRefreshCookie } from "@/lib/auth/cookies";

export const runtime = "nodejs";

export async function POST() {
  const refreshToken = await getRefreshCookie();
  await authApiFetch("/auth/logout", {
    method: "POST",
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
  });
  await clearAuthCookies();
  return NextResponse.json({ ok: true });
}
