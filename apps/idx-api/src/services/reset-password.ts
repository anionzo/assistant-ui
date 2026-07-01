import { randomBytes, createHash } from "node:crypto";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export function generateResetToken() {
  return randomBytes(32).toString("base64url");
}

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function resetTokenExpiresAt() {
  return new Date(Date.now() + RESET_TOKEN_TTL_MS);
}
