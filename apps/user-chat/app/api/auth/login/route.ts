import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/auth-api-client";
import { REFRESH_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/auth/cookies";

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

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await authApiFetch<AuthApiResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const response = NextResponse.json({ user: result.data.user });
  response.cookies.set(SESSION_COOKIE_NAME, result.data.accessToken, {
    ...cookieBase,
    maxAge: Number(process.env.JWT_ACCESS_TTL ?? 3600),
  });
  response.cookies.set(REFRESH_COOKIE_NAME, result.data.refreshToken, {
    ...cookieBase,
    maxAge: Number(process.env.JWT_REFRESH_TTL ?? 604_800),
  });
  return response;
}
