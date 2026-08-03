import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "idx_session";

function jwtSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

/**
 * Soft gate for chat/settings pages.
 * - Valid access token → continue.
 * - Missing/expired access token → continue without clearing cookies.
 *   Server routes use resolveSession() which can rotate via idx_refresh.
 * Clearing refresh here used to force a hard logout when the access JWT expired.
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = jwtSecretKey();
  if (!token || !secret) {
    return NextResponse.next();
  }

  try {
    await jwtVerify(token, secret);
  } catch {
    // Expired/invalid access JWT — leave cookies intact for BFF refresh.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/chat/:path*", "/settings/:path*"],
};
