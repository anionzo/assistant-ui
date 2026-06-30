import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/auth-api-client";
import { setSessionCookie } from "@/lib/auth/cookies";

type AuthApiResponse = {
  accessToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await authApiFetch<AuthApiResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await setSessionCookie(result.data.accessToken);
  return NextResponse.json({ user: result.data.user }, { status: 201 });
}
