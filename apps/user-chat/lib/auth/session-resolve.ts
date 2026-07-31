import { authApiFetch } from "@/lib/auth/auth-api-client";
import {
  getRefreshCookie,
  getSessionCookie,
  setAuthCookies,
} from "@/lib/auth/cookies";
import { tryVerifySessionToken, type SessionUser } from "@/lib/auth/session";
import { getServerConfig } from "@/lib/server/config";

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: SessionUser;
};

export type ResolvedSession = {
  user: SessionUser;
  accessToken: string;
  refreshed: boolean;
};

const refreshInFlight = new Map<string, Promise<ResolvedSession | null>>();

async function refreshSession(refreshToken: string) {
  return authApiFetch<RefreshResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

async function doRefresh(refreshToken: string): Promise<ResolvedSession | null> {
  const result = await refreshSession(refreshToken);
  if (!result.ok) return null;

  await setAuthCookies(result.data.accessToken, result.data.refreshToken);
  return {
    user: result.data.user,
    accessToken: result.data.accessToken,
    refreshed: true,
  };
}

export async function resolveSession(): Promise<ResolvedSession | null> {
  const config = getServerConfig();
  const accessToken = await getSessionCookie();

  if (accessToken) {
    const user = await tryVerifySessionToken(accessToken, config.jwtSecret);
    if (user) {
      return { user, accessToken, refreshed: false };
    }
    // Access token expired or invalid — fall through to refresh.
  }

  const refreshToken = await getRefreshCookie();
  if (!refreshToken) return null;

  // Deduplicate concurrent refresh calls for the same token
  let pending = refreshInFlight.get(refreshToken);
  if (!pending) {
    pending = doRefresh(refreshToken).finally(() => {
      refreshInFlight.delete(refreshToken);
    });
    refreshInFlight.set(refreshToken, pending);
  }

  return pending;
}

/**
 * Lightweight session probe for Server Components (layouts).
 * Verifies access JWT when present. If expired/missing but idx_refresh exists,
 * returns a stub user so UI can treat the visitor as authenticated without
 * calling /auth/refresh (cookie writes are not allowed in RSC render — rotating
 * server-side while the browser keeps the old RT would lock the user out).
 * Route handlers should use resolveSession() to actually rotate tokens.
 */
export async function checkSession(): Promise<SessionUser | null> {
  const config = getServerConfig();
  const accessToken = await getSessionCookie();
  if (accessToken) {
    const user = await tryVerifySessionToken(accessToken, config.jwtSecret);
    if (user) return user;
  }

  const refreshToken = await getRefreshCookie();
  if (!refreshToken) return null;

  return {
    id: "refresh-pending",
    email: "",
    displayName: null,
    avatarUrl: null,
  };
}