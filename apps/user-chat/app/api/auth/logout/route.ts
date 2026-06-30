import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/auth-api-client";
import { clearSessionCookie } from "@/lib/auth/cookies";

export const runtime = "nodejs";

export async function POST() {
  await authApiFetch("/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
