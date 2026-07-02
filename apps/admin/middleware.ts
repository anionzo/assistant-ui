import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ipMatchesAllowlist } from "@/lib/ip-allowlist";
import { fetchIpAllowlistSettings, resolveClientIp } from "@/lib/server/ip-allowlist";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/google", "/api/auth/callback", "/api/health", "/api/branding"];

const IP_CHECK_EXEMPT = [
  "/api/auth/me",
  "/api/client-ip",
  "/api/settings/ip-allowlist",
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname === p + "/")
    || pathname.startsWith("/_next/")
    || pathname.startsWith("/api/auth/");
}

function isIpCheckExempt(pathname: string) {
  return IP_CHECK_EXEMPT.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const hasSession = request.cookies.has("idx_session");

  if (!hasSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "authentication required", code: "missing_session" },
        { status: 401 },
      );
    }
    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3002";
    return NextResponse.redirect(new URL("/login", frontendUrl));
  }

  if (pathname.startsWith("/api/") && !isIpCheckExempt(pathname)) {
    try {
      const settings = await fetchIpAllowlistSettings();
      if (settings.enabled) {
        const ip = resolveClientIp(request.headers);
        if (!ipMatchesAllowlist(ip, settings.ips)) {
          return NextResponse.json(
            { error: "Forbidden — IP not in allowlist", code: "forbidden_ip" },
            { status: 403 },
          );
        }
      }
    } catch {
      // If settings cannot be loaded, do not block (fail-open for availability).
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};