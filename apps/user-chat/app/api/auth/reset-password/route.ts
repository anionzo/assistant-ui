import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/auth-api-client";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.token || !body?.password) {
    return NextResponse.json({ error: "token and password are required" }, { status: 400 });
  }

  const result = await authApiFetch("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token: body.token, password: body.password }),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
