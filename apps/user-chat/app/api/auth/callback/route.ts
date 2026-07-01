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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const exchange = url.searchParams.get("exchange");
  const returnTo = url.searchParams.get("returnTo") ?? "/chat";
  if (!exchange) {
    return NextResponse.json({ error: "Missing exchange code" }, { status: 400 });
  }

  const result = await authApiFetch<AuthApiResponse>("/auth/exchange", {
    method: "POST",
    body: JSON.stringify({ code: exchange }),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const redirect = NextResponse.redirect(new URL(returnTo, request.url), 302);
  redirect.cookies.set(SESSION_COOKIE_NAME, result.data.accessToken, {
    ...cookieBase,
    maxAge: Number(process.env.JWT_ACCESS_TTL ?? 3600),
  });
  redirect.cookies.set(REFRESH_COOKIE_NAME, result.data.refreshToken, {
    ...cookieBase,
    maxAge: Number(process.env.JWT_REFRESH_TTL ?? 604_800),
  });
  return redirect;
}
