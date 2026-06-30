import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
  const allowlist = process.env.ADMIN_IP_ALLOWLIST?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  if (allowlist.length === 0) return NextResponse.next();

  const ip = clientIp(request);
  if (!ipAllowed(ip, allowlist)) {
    return NextResponse.json(
      { error: "Forbidden — IP not in allowlist", code: "forbidden" },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};