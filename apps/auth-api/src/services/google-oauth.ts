import { OAuth2Client } from "google-auth-library";

export type GoogleProfile = {
  email: string;
  emailVerified: boolean;
  sub: string;
  name: string | null;
  picture: string | null;
  frontend: string;
};

type StateEntry = {
  returnTo: string;
  frontend: string;
  expiresAt: number;
};

const stateStore = new Map<string, StateEntry>();

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function getClient() {
  return new OAuth2Client(
    getRequiredEnv("GOOGLE_CLIENT_ID"),
    getRequiredEnv("GOOGLE_CLIENT_SECRET"),
    getRequiredEnv("GOOGLE_CALLBACK_URL"),
  );
}

export function createGoogleAuthUrl(returnTo?: string, frontend?: string) {
  const state = crypto.randomUUID();
  stateStore.set(state, {
    returnTo: returnTo && returnTo.startsWith("/") ? returnTo : "/",
    frontend: frontend ?? process.env.FRONTEND_URL ?? "http://localhost:3001",
    expiresAt: Date.now() + 10 * 60_000,
  });

  const client = getClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["openid", "email", "profile"],
    state,
  });

  return { url, state };
}

export async function exchangeGoogleCode(code: string, state: string): Promise<GoogleProfile & { returnTo: string }> {
  const stateEntry = stateStore.get(state);
  stateStore.delete(state);
  if (!stateEntry || stateEntry.expiresAt < Date.now()) {
    throw new Error("Invalid Google OAuth state");
  }

  const client = getClient();
  const tokenResult = await client.getToken(code);
  if (!tokenResult.tokens.id_token) {
    throw new Error("Google OAuth did not return an id_token");
  }

  const ticket = await client.verifyIdToken({
    idToken: tokenResult.tokens.id_token,
    audience: getRequiredEnv("GOOGLE_CLIENT_ID"),
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error("Google profile is incomplete");
  }

  return {
    email: payload.email,
    emailVerified: payload.email_verified ?? false,
    sub: payload.sub,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
    frontend: stateEntry.frontend,
    returnTo: stateEntry.returnTo,
  };
}
