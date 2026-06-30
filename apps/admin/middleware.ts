import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/google", "/api/auth/callback", "/api/health"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname === p + "/")
    || pathname.startsWith("/_next/")
    || pathname.startsWith("/api/auth/");
}

function clientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "127.0.0.1";
  return request.headers.get("x-real-ip") ?? "127.0.0.1";
}

function ipAllowed(ip: string, allowlist: string[]) {
  if (ip === "127.0.0.1" || ip === "::1") return true;
  return allowlist.some((entry) => {
    const base = entry.split("/")[0]?.trim();
    return base ? ip === base || ip.startsWith(base) : false;
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // public paths: login page, auth APIs, health
  if (isPublic(pathname)) return NextResponse.next();

  // Layer 1: cookie presence check (redirect only, NOT security)
  // Real JWT verification happens in route handlers via verifySessionToken()
  const hasSession = request.cookies.has("idx_session");

  if (!hasSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "authentication required", code: "missing_session" },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // IP allowlist for API routes (defense in depth)
  if (pathname.startsWith("/api/")) {
    const allowlist = process.env.ADMIN_IP_ALLOWLIST?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
    if (allowlist.length > 0) {
      const ip = clientIp(request);
      if (!ipAllowed(ip, allowlist)) {
        return NextResponse.json(
          { error: "Forbidden — IP not in allowlist", code: "forbidden" },
          { status: 403 },
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};