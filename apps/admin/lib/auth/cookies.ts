import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "idx_session";
export const REFRESH_COOKIE_NAME = "idx_refresh";

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, accessToken, {
      ...cookieBase,
      maxAge: Number(process.env.JWT_ACCESS_TTL ?? 3600),
    });
    cookieStore.set(REFRESH_COOKIE_NAME, refreshToken, {
      ...cookieBase,
      maxAge: Number(process.env.JWT_REFRESH_TTL ?? 604_800),
    });
  } catch {
    // Cookie write not allowed (e.g. in Server Components).
    // Route handlers will set cookies; this is a no-op for Server Components.
  }
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  const cleared = { ...cookieBase, expires: new Date(0) };
  cookieStore.set(SESSION_COOKIE_NAME, "", cleared);
  cookieStore.set(REFRESH_COOKIE_NAME, "", cleared);
}

export async function getSessionCookie() {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}

export async function getRefreshCookie() {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(REFRESH_COOKIE_NAME)?.value ?? null;
  } catch {
    return null;
  }
}
