import { authApiFetch } from "@/lib/auth/auth-api-client";
import {
  getRefreshCookie,
  getSessionCookie,
  setAuthCookies,
} from "@/lib/auth/cookies";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  roleIds: number[];
  permissionIds: number[];
};

type MeResponse = {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  roles: Array<{ id: number; name: string }>;
  permissions: string[];
  permission_ids: number[];
};

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  roles?: Array<{ id: number; name: string }>;
  permissions?: string[];
  permission_ids?: number[];
};

export type ResolvedSession = {
  user: SessionUser;
  accessToken: string;
  refreshed: boolean;
};

function toSessionUser(
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  },
  roles: Array<{ id: number; name: string }> | undefined,
  permissionIds: number[] | undefined,
): SessionUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    roleIds: roles?.map((r) => r.id) ?? [],
    permissionIds: permissionIds ?? [],
  };
}

async function verifyViaAuthApi(accessToken: string): Promise<SessionUser | null> {
  const result = await authApiFetch<MeResponse>("/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!result.ok) return null;
  return toSessionUser(
    result.data.user,
    result.data.roles,
    result.data.permission_ids,
  );
}

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
    user: toSessionUser(
      result.data.user,
      result.data.roles,
      result.data.permission_ids,
    ),
    accessToken: result.data.accessToken,
    refreshed: true,
  };
}

export async function resolveSession(): Promise<ResolvedSession | null> {
  try {
    const accessToken = await getSessionCookie();

    if (accessToken) {
      const user = await verifyViaAuthApi(accessToken);
      if (user) {
        return { user, accessToken, refreshed: false };
      }
      // expired — fall through to refresh
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
  } catch {
    return null;
  }
}

export async function resolveAdminSession(): Promise<ResolvedSession | null> {
  const session = await resolveSession();
  if (!session) return null;
  if (!Array.isArray(session.user.roleIds) || session.user.roleIds.length === 0) {
    return null;
  }
  return session;
}
