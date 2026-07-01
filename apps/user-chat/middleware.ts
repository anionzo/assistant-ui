import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "idx_session";
const REFRESH_COOKIE_NAME = "idx_refresh";

function jwtSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = jwtSecretKey();
  if (!token || !secret) {
    return NextResponse.next();
  }

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const response = NextResponse.next();
    response.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    response.cookies.set(REFRESH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return response;
  }
}

export const config = {
  matcher: ["/chat/:path*", "/settings/:path*"],
};