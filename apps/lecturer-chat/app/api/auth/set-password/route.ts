import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/auth-api-client";
import { getSessionCookie } from "@/lib/auth/cookies";

export async function POST(request: Request) {
  const token = await getSessionCookie();
  if (!token) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.password) return NextResponse.json({ error: "password is required" }, { status: 400 });

  const result = await authApiFetch("/auth/set-password", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password: body.password }),
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}