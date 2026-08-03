import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/auth-api-client";
import { setAuthCookies } from "@/lib/auth/cookies";

type AuthApiResponse = {
  accessToken: string;
  refreshToken: string;
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

  await setAuthCookies(result.data.accessToken, result.data.refreshToken);
  return NextResponse.json({ user: result.data.user }, { status: 201 });
}
