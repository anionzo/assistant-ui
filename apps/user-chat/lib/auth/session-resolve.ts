import { authApiFetch } from "@/lib/auth/auth-api-client";
import {
  getRefreshCookie,
  getSessionCookie,
  setAuthCookies,
} from "@/lib/auth/cookies";
import { verifySessionToken, type SessionUser } from "@/lib/auth/session";
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
    try {
      const user = await verifySessionToken(accessToken, config.jwtSecret);
      return { user, accessToken, refreshed: false };
    } catch {
      // Access token expired or invalid — fall through to refresh.
    }
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