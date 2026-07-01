import { createMiddleware } from "hono/factory";
import { verifySessionToken, type SessionClaims } from "../services/jwt";
import { ROLES } from "../services/permissions";
import { resolveUserPermissions, resolveUserRoles } from "../services/rbac";
import { ErrorCode } from "../utils/errors";
import { unauthorized, invalidToken, forbidden } from "../utils/response";
import type { AuthStore } from "../db/store";

export type AuthContext = {
  session: SessionClaims;
};

function getBearerToken(header: string | undefined) {
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

export const requireAuth = createMiddleware<{ Variables: { auth: AuthContext } }>(async (c, next) => {
  const token = getBearerToken(c.req.header("authorization"));
  if (!token) {
    return unauthorized(c);
  }

  try {
    const session = await verifySessionToken(token);
    c.set("auth", { session });
    await next();
  } catch {
    return invalidToken(c);
  }
});

function resolveStore(c: any): AuthStore | undefined {
  return (c.get ? c.get("authStore") : undefined) ?? undefined;
}

export function requirePermission(code: string) {
  return createMiddleware<{ Variables: { auth: AuthContext } }>(async (c, next) => {
    const auth = c.get("auth");
    if (!auth?.session) {
      return unauthorized(c);
    }

    const store = resolveStore(c);
    const permissions = await resolveUserPermissions(auth.session.id, store);
    if (!permissions.includes(code)) {
      return forbidden(c, `missing permission: ${code}`, ErrorCode.MISSING_PERMISSION);
    }

    await next();
  });
}

export function requireAnyPermission(codes: string[]) {
  return createMiddleware<{ Variables: { auth: AuthContext } }>(async (c, next) => {
    const auth = c.get("auth");
    if (!auth?.session) {
      return unauthorized(c);
    }

    const store = resolveStore(c);
    const permissions = await resolveUserPermissions(auth.session.id, store);
    if (!codes.some((code) => permissions.includes(code))) {
      return forbidden(c, `missing permission: ${codes.join(" | ")}`, ErrorCode.MISSING_PERMISSION);
    }

    await next();
  });
}

export function requireSuperAdmin() {
  return createMiddleware<{ Variables: { auth: AuthContext } }>(async (c, next) => {
    const auth = c.get("auth");
    if (!auth?.session) {
      return unauthorized(c);
    }

    const store = resolveStore(c);
    const roles = await resolveUserRoles(auth.session.id, store);
    if (!roles.some((role) => role.id === ROLES.SUPER_ADMIN)) {
      return forbidden(c, "super_admin required");
    }

    await next();
  });
}

export function requireAnyAdmin() {
  return createMiddleware<{ Variables: { auth: AuthContext } }>(async (c, next) => {
    const auth = c.get("auth");
    if (!auth?.session) {
      return unauthorized(c);
    }

    // Query DB for real-time role check (not stale JWT)
    const store = resolveStore(c);
    const roles = await resolveUserRoles(auth.session.id, store);
    if (roles.length === 0) {
      return forbidden(c, "admin access required");
    }

    await next();
  });
}
