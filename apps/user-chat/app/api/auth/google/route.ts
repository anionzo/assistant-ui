import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/server/config";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { authApiUrl } = getServerConfig();
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/";
  return NextResponse.redirect(`${authApiUrl}/auth/google?returnTo=${encodeURIComponent(returnTo)}`, 302);
}
