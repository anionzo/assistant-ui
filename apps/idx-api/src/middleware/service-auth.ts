import { timingSafeEqual } from "node:crypto";
import { createMiddleware } from "hono/factory";
import { forbidden, unauthorized } from "../utils/response";

export const SERVICE_AUTH_HEADER = "x-idx-service-token";

function getServiceSecret() {
  const secret = process.env.IDX_SERVICE_SECRET?.trim();
  if (!secret) throw new Error("IDX_SERVICE_SECRET is required");
  return secret;
}

export function verifyServiceToken(header: string | undefined): boolean {
  if (!header) return false;
  try {
    const expected = getServiceSecret();
    const received = Buffer.from(header);
    const target = Buffer.from(expected);
    if (received.length !== target.length) return false;
    return timingSafeEqual(received, target);
  } catch {
    return false;
  }
}

export const requireServiceAuth = createMiddleware(async (c, next) => {
  const token = c.req.header(SERVICE_AUTH_HEADER);
  if (!token) {
    return unauthorized(c, "missing service token");
  }
  if (!verifyServiceToken(token)) {
    return forbidden(c, "invalid service token");
  }
  await next();
});