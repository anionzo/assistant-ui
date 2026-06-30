import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

export type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  roleIds: number[];
};

export type SessionClaims = SessionUser & {
  sub: string;
};

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");
  return encoder.encode(secret);
}

function getAccessTtlSeconds() {
  const ttl = Number(process.env.JWT_ACCESS_TTL ?? 3600);
  if (!Number.isInteger(ttl) || ttl < 60) {
    throw new Error("JWT_ACCESS_TTL must be an integer >= 60");
  }
  return ttl;
}

export async function signSessionToken(user: SessionUser) {
  return new SignJWT({
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role_ids: user.roleIds,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${getAccessTtlSeconds()}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, getSecret());

  if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
    throw new Error("Invalid session token");
  }

  return {
    sub: payload.sub,
    id: payload.sub,
    email: payload.email,
    displayName: typeof payload.displayName === "string" ? payload.displayName : null,
    avatarUrl: typeof payload.avatarUrl === "string" ? payload.avatarUrl : null,
    roleIds: Array.isArray(payload.role_ids) ? payload.role_ids.filter((v: unknown): v is number => typeof v === "number") : [],
  };
}
