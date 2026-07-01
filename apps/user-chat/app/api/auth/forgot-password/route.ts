import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/auth-api-client";
import { isSelfServicePasswordResetEnabled } from "@/lib/server/password-reset-policy";

export async function POST(request: Request) {
  if (!isSelfServicePasswordResetEnabled()) {
    return NextResponse.json(
      { error: "self-service password reset is disabled; contact an administrator" },
      { status: 403 },
    );
  }
  const body = await request.json().catch(() => null);
  if (!body?.email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const result = await authApiFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: body.email }),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
