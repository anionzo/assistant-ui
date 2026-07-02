import { apiErrorMessage, unwrapApiData } from "@/lib/api-payload";
import { resolveSession } from "@/lib/auth/session-resolve";
import type { SessionUser } from "@/lib/auth/session";
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
  const session = await resolveSession();
  if (!session) return { ok: false, error: "Missing session cookie", status: 401 };
  return { ok: true, token: session.accessToken, user: session.user };
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

  if (!response.ok || payload.success === false) {
    return {
      ok: false as const,
      status: response.status,
      error: apiErrorMessage(payload) ?? "Auth API request failed",
    };
  }

  return { ok: true as const, data: unwrapApiData<T>(payload) };
}
