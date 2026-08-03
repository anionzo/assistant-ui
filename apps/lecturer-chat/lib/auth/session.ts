import { jwtVerify } from "jose";

const encoder = new TextEncoder();

export type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

function getSecret(secret?: string) {
  const resolved = secret ?? process.env.JWT_SECRET;
  if (!resolved) throw new Error("JWT_SECRET is required when auth is enabled");
  return encoder.encode(resolved);
}

export async function verifySessionToken(token: string, secret?: string): Promise<SessionUser> {
  const { payload } = await jwtVerify(token, getSecret(secret));
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
    throw new Error("Invalid session token");
  }

  return {
    id: payload.sub,
    email: payload.email,
    displayName: typeof payload.displayName === "string" ? payload.displayName : null,
    avatarUrl: typeof payload.avatarUrl === "string" ? payload.avatarUrl : null,
  };
}

export async function tryVerifySessionToken(
  token: string,
  secret?: string,
): Promise<SessionUser | null> {
  try {
    return await verifySessionToken(token, secret);
  } catch {
    return null;
  }
}
