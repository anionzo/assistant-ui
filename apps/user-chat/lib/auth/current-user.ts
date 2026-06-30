export type AuthUser = {
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

const CURRENT_USER_TTL_MS = 30_000;

let cachedUser: { user: AuthUser | null; expiresAt: number } | null = null;
let inFlight: Promise<AuthUser | null> | null = null;

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  if (cachedUser && cachedUser.expiresAt > Date.now()) {
    return cachedUser.user;
  }

  if (inFlight) return inFlight;

  inFlight = fetch("/api/auth/me", { credentials: "include" })
    .then((response) => (response.ok ? response.json() : null))
    .then((data: { user?: AuthUser } | null) => data?.user ?? null)
    .then((user) => {
      cachedUser = { user, expiresAt: Date.now() + CURRENT_USER_TTL_MS };
      return user;
    })
    .catch(() => {
      cachedUser = { user: null, expiresAt: Date.now() + CURRENT_USER_TTL_MS };
      return null;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function invalidateCurrentUser() {
  cachedUser = null;
  inFlight = null;
}