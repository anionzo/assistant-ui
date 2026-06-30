import { NextResponse } from "next/server";
import { getAdminConfig } from "@/lib/server/config";

export async function GET(request: Request) {
  const { authApiUrl, frontendUrl } = getAdminConfig();
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/";
  const target = `${authApiUrl}/auth/google?returnTo=${encodeURIComponent(returnTo)}&frontend=${encodeURIComponent(frontendUrl)}`;
  return NextResponse.redirect(target, 302);
}
