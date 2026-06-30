import { getSessionCookie } from "@/lib/auth/cookies";
import { verifySessionToken, type SessionUser } from "@/lib/auth/session";
import { getServerConfig } from "@/lib/server/config";

export type ThreadDto = {
  id: string;
  title: string;
  conversationId: string;
  tenantId: string;
  updatedAt: string;
  archived: boolean;
};

export async function requireSessionUser(): Promise<
  | { ok: true; token: string; user: SessionUser }
  | { ok: false; error: string; status: number }
> {
  const token = await getSessionCookie();
  if (!token) return { ok: false, error: "Missing session cookie", status: 401 };

  try {
    const config = getServerConfig();
    const user = await verifySessionToken(token, config.jwtSecret);
    return { ok: true, token, user };
  } catch {
    return { ok: false, error: "Invalid session cookie", status: 401 };
  }
}

export async function authThreadFetch<T>(path: string, init: RequestInit, token: string) {
  const config = getServerConfig();
  const response = await fetch(`${config.authApiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      error:
        typeof payload.error === "string"
          ? payload.error
          : "Auth API request failed",
    };
  }

  return { ok: true as const, data: payload as T };
}
