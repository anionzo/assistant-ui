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
  user: SessionUser;
  roles: Array<{ id: number; name: string }>;
  permissions: string[];
  permission_ids: number[];
};

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: SessionUser;
  permission_ids?: number[];
};

export type ResolvedSession = {
  user: SessionUser;
  accessToken: string;
  refreshed: boolean;
};

async function verifyViaAuthApi(accessToken: string) {
  const result = await authApiFetch<MeResponse>("/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!result.ok) return null;
  return {
    ...result.data.user,
    roleIds: result.data.roles.map((r) => r.id),
    permissionIds: result.data.permission_ids ?? [],
  };
}

async function refreshSession(refreshToken: string) {
  return authApiFetch<RefreshResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
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

    const result = await refreshSession(refreshToken);
    if (!result.ok) return null;

    await setAuthCookies(result.data.accessToken, result.data.refreshToken);
    return {
      user: result.data.user,
      accessToken: result.data.accessToken,
      refreshed: true,
    };
  } catch {
    return null;
  }
}

export async function resolveAdminSession(): Promise<ResolvedSession | null> {
  const session = await resolveSession();
  if (!session) return null;
  if (session.user.roleIds.length === 0) return null;
  return session;
}
