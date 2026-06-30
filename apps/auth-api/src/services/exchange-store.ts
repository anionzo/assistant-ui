import type { SessionUser } from "./jwt";

type ExchangeEntry = {
  accessToken: string;
  user: SessionUser;
  expiresAt: number;
};

const exchangeStore = new Map<string, ExchangeEntry>();

export function createExchange(accessToken: string, user: SessionUser) {
  const code = crypto.randomUUID();
  exchangeStore.set(code, {
    accessToken,
    user,
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
