import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/auth-api-client";
import { setAuthCookies } from "@/lib/auth/cookies";

type ExchangeResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: string; email: string; displayName: string | null; avatarUrl: string | null };
  roles: Array<{ id: number; name: string }>;
  permissions: string[];
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const exchange = url.searchParams.get("exchange");
  const returnTo = url.searchParams.get("returnTo") ?? "/";
  if (!exchange) {
    return NextResponse.json({ error: "Missing exchange code" }, { status: 400 });
  }

  const result = await authApiFetch<ExchangeResponse>("/auth/exchange", {
    method: "POST",
    body: JSON.stringify({ code: exchange }),
  });
  if (!result.ok) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(result.error)}`, request.url), 302);
  }

  if (result.data.roles.length === 0) {
    return NextResponse.redirect(new URL("/login?error=This+account+does+not+have+admin+access", request.url), 302);
  }

  await setAuthCookies(result.data.accessToken, result.data.refreshToken);
  return NextResponse.redirect(new URL(returnTo, request.url), 302);
}
