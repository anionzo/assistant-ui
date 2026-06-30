import { createMiddleware } from "hono/factory";
import { verifySessionToken, type SessionClaims } from "../services/jwt";
import { resolveUserPermissions } from "../services/rbac";

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
    return c.json({ error: "missing bearer token" }, 401);
  }

  try {
    const session = await verifySessionToken(token);
    c.set("auth", { session });
    await next();
  } catch {
    return c.json({ error: "invalid or expired token" }, 401);
  }
});

export function requirePermission(code: string) {
  return createMiddleware<{ Variables: { auth: AuthContext } }>(async (c, next) => {
    const auth = c.get("auth");
    if (!auth?.session) {
      return c.json({ error: "unauthorized" }, 401);
    }

    const permissions = await resolveUserPermissions(auth.session.id);
    if (!permissions.includes(code)) {
      return c.json({ error: `missing permission: ${code}` }, 403);
    }

    await next();
  });
}

export function requireAnyAdmin() {
  return createMiddleware<{ Variables: { auth: AuthContext } }>(async (c, next) => {
    const auth = c.get("auth");
    if (!auth?.session) {
      return c.json({ error: "unauthorized" }, 401);
    }

    if (auth.session.roleIds.length === 0) {
      return c.json({ error: "admin access required" }, 403);
    }

    await next();
  });
}
