import type { SessionUser } from "./jwt";

type ExchangeEntry = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  roles: Array<{ id: number; name: string }>;
  permissions: string[];
  expiresAt: number;
};

const exchangeStore = new Map<string, ExchangeEntry>();

export function createExchange(
  accessToken: string,
  refreshToken: string,
  sessionUser: SessionUser,
  roles: Array<{ id: number; name: string }>,
  permissions: string[],
) {
  const code = crypto.randomUUID();
  exchangeStore.set(code, {
    accessToken,
    refreshToken,
    user: {
      id: sessionUser.id,
      email: sessionUser.email,
      displayName: sessionUser.displayName,
      avatarUrl: sessionUser.avatarUrl,
    },
    roles,
    permissions,
    expiresAt: Date.now() + 60_000,
  });
  return code;
}

export function consumeExchange(code: string) {
  const entry = exchangeStore.get(code);
  exchangeStore.delete(code);

  if (!entry) return null;
  if (entry.expiresAt < Date.now()) return null;
  return entry;
}
