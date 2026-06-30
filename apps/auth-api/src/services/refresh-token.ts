import { createHash, randomBytes } from "node:crypto";

export function generateRefreshToken() {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getRefreshTtlSeconds() {
  const ttl = Number(process.env.JWT_REFRESH_TTL ?? 604_800);
  if (!Number.isInteger(ttl) || ttl < 3600) {
    throw new Error("JWT_REFRESH_TTL must be an integer >= 3600");
  }
  return ttl;
}

export function refreshTokenExpiresAt() {
  return new Date(Date.now() + getRefreshTtlSeconds() * 1000);
}