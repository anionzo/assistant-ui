import { NextResponse } from "next/server";
import { clearAuthCookies, getRefreshCookie } from "@/lib/auth/cookies";
import { authApiFetch } from "@/lib/auth/auth-api-client";

export async function POST() {
  try {
    const refreshToken = await getRefreshCookie();
    if (refreshToken) {
      await authApiFetch("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
    }
    await clearAuthCookies();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Logout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
