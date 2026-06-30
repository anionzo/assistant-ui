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

  await setSessionCookie(result.data.accessToken);
  return NextResponse.redirect(new URL(returnTo, request.url), 302);
}
