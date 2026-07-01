import { Hono } from "hono";
import { type AuthStore, getAuthStore } from "../db/store";
import { resolveUserPermissionIds, resolveUserPermissions, resolveUserRoles } from "../services/rbac";
import { createExchange, consumeExchange } from "../services/exchange-store";
import { createGoogleAuthUrl, exchangeGoogleCode } from "../services/google-oauth";
import { signSessionToken, verifySessionToken, type SessionUser } from "../services/jwt";
import { hashPassword, verifyPassword } from "../services/password";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiresAt,
} from "../services/refresh-token";
import {
  generateResetToken,
  hashResetToken,
  resetTokenExpiresAt,
} from "../services/reset-password";
import {
  badRequest,
  conflict,
  created,
  forbidden,
  invalidToken,
  notFound,
  ok,
  okPlain,
  unauthorized,
} from "../utils/response";

type LoginBody = {
  email?: string;
  password?: string;
  displayName?: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toSessionUser(user: {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}): SessionUser {
  return { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl, roleIds: [] };
}

export function createAuthRoutes(store: AuthStore = getAuthStore()) {
  const authRoutes = new Hono();

  async function issueSession(user: SessionUser) {
    const [roleIds, resolvedRoles, permissionCodes, permissionIds] = await Promise.all([
      resolveUserRoles(user.id, store).then((roles) => roles.map((r) => r.id)),
      resolveUserRoles(user.id, store),
      resolveUserPermissions(user.id, store),
      resolveUserPermissionIds(user.id, store),
    ]);

    const accessToken = await signSessionToken({ ...user, roleIds });
    const refreshToken = generateRefreshToken();
    await store.createRefreshToken({
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshTokenExpiresAt(),
    });

    return {
      accessToken, refreshToken,
      expiresIn: Number(process.env.JWT_ACCESS_TTL ?? 3600),
      user: { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl },
      roles: resolvedRoles.map((r) => ({ id: r.id, name: r.name })),
      permissions: permissionCodes,
      permission_ids: permissionIds,
    };
  }

  // ── Google OAuth ──────────────────────────────────────

  authRoutes.get("/google", (c) => {
    const returnTo = c.req.query("returnTo") ?? "/";
    const frontend = c.req.query("frontend") || undefined;
    const { url } = createGoogleAuthUrl(returnTo, frontend);
    return c.redirect(url, 302);
  });

  authRoutes.get("/google/callback", async (c) => {
    const code = c.req.query("code"), state = c.req.query("state");
    if (!code || !state) return badRequest(c, "Missing Google callback parameters");

    let profile: Awaited<ReturnType<typeof exchangeGoogleCode>>;
    try { profile = await exchangeGoogleCode(code, state); }
    catch (error) {
      const msg = error instanceof Error ? error.message : "Google OAuth callback failed";
      console.error("[auth-api][google-callback][exchange]", msg);
      return badRequest(c, msg);
    }

    let existingOAuth;
    try { existingOAuth = await store.findOAuthAccount("google", profile.sub); }
    catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to load Google account link";
      console.error("[auth-api][google-callback][lookup-oauth]", msg);
      return badRequest(c, msg);
    }

    let user = existingOAuth ? await store.findUserById(existingOAuth.userId) : null;

    if (!user) {
      const existingUser = await store.findUserByEmail(normalizeEmail(profile.email));
      if (existingUser) {
        user = existingUser;
        await store.createOAuthAccount({ provider: "google", providerAccountId: profile.sub, userId: existingUser.id });
      } else {
        user = await store.createUser({
          email: normalizeEmail(profile.email),
          displayName: profile.name,
          avatarUrl: profile.picture,
        });
        await store.createOAuthAccount({ provider: "google", providerAccountId: profile.sub, userId: user.id });
      }
    }

    if (!user) return badRequest(c, "Unable to create Google session");

    const seedEmail = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
    if (seedEmail && normalizeEmail(user.email) === seedEmail) {
      await store.ensureUserRole(user.id, "super_admin");
    }

    const sessionUser = toSessionUser(user);
    const session = await issueSession(sessionUser);
    const exchangeCode = createExchange(
      session.accessToken, session.refreshToken, sessionUser,
      session.roles, session.permissions, session.permission_ids,
    );
    return c.redirect(`${profile.frontend}/api/auth/callback?exchange=${encodeURIComponent(exchangeCode)}&returnTo=${encodeURIComponent(profile.returnTo)}`, 302);
  });

  // ── OAuth exchange ────────────────────────────────────

  authRoutes.post("/exchange", async (c) => {
    const body = await c.req.json<{ code?: string }>().catch(() => null);
    if (!body?.code) return badRequest(c, "code is required");
    const exchange = consumeExchange(body.code);
    if (!exchange) return badRequest(c, "exchange code is invalid or expired");
    return ok(c, {
      accessToken: exchange.accessToken, refreshToken: exchange.refreshToken,
      expiresIn: Number(process.env.JWT_ACCESS_TTL ?? 3600),
      user: exchange.user, roles: exchange.roles,
      permissions: exchange.permissions, permission_ids: exchange.permissionIds,
    });
  });

  // ── Refresh ───────────────────────────────────────────

  authRoutes.post("/refresh", async (c) => {
    const body = await c.req.json<{ refreshToken?: string }>().catch(() => null);
    if (!body?.refreshToken) return badRequest(c, "refreshToken is required");

    const tokenHash = hashRefreshToken(body.refreshToken);
    const record = await store.findValidRefreshToken(tokenHash);
    if (!record) return invalidToken(c, "refresh token is invalid or expired");

    const user = await store.findUserById(record.userId);
    if (!user) return invalidToken(c, "refresh token is invalid or expired");

    await store.revokeRefreshToken(tokenHash);
    return ok(c, await issueSession(toSessionUser(user)));
  });

  // ── Register ──────────────────────────────────────────

  authRoutes.post("/register", async (c) => {
    const body = await c.req.json<LoginBody>().catch(() => null);
    if (!body?.email || !body.password) return badRequest(c, "email and password are required");

    const email = normalizeEmail(body.email);
    const existingUser = await store.findUserByEmail(email);
    if (existingUser) return conflict(c, "email is already registered");

    const user = await store.createUser({
      email, passwordHash: await hashPassword(body.password),
      displayName: body.displayName?.trim() || null,
    });

    const seedEmail = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
    if (seedEmail && email === seedEmail) await store.ensureUserRole(user.id, "super_admin");

    return created(c, await issueSession(toSessionUser(user)));
  });

  // ── Login ─────────────────────────────────────────────

  authRoutes.post("/login", async (c) => {
    const body = await c.req.json<LoginBody>().catch(() => null);
    if (!body?.email || !body.password) return badRequest(c, "email and password are required");

    const user = await store.findUserByEmail(normalizeEmail(body.email));
    if (!user?.passwordHash) return unauthorized(c, "invalid email or password");

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) return unauthorized(c, "invalid email or password");

    return ok(c, await issueSession(toSessionUser(user)));
  });

  // ── Me ────────────────────────────────────────────────

  authRoutes.get("/me", async (c) => {
    const authorization = c.req.header("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
    if (!token) return unauthorized(c);

    try {
      const claims = await verifySessionToken(token);
      const [roles, permissions, permissionIds] = await Promise.all([
        resolveUserRoles(claims.id, store),
        resolveUserPermissions(claims.id, store),
        resolveUserPermissionIds(claims.id, store),
      ]);
      return ok(c, {
        user: { id: claims.id, email: claims.email, displayName: claims.displayName, avatarUrl: claims.avatarUrl },
        roles: roles.map((r) => ({ id: r.id, name: r.name })),
        permissions, permission_ids: permissionIds,
      });
    } catch {
      return invalidToken(c);
    }
  });

  // ── Logout ────────────────────────────────────────────

  authRoutes.post("/logout", async (c) => {
    const body = await c.req.json<{ refreshToken?: string }>().catch(() => null);
    if (body?.refreshToken) await store.revokeRefreshToken(hashRefreshToken(body.refreshToken));
    return okPlain(c);
  });

  // ── Set password (OAuth users) ────────────────────────

  authRoutes.post("/set-password", async (c) => {
    const authorization = c.req.header("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
    if (!token) return unauthorized(c);

    let claims;
    try { claims = await verifySessionToken(token); }
    catch { return invalidToken(c); }

    const body = await c.req.json<{ password?: string }>().catch(() => null);
    if (!body?.password || body.password.length < 8) return badRequest(c, "password must be at least 8 characters");

    const user = await store.findUserById(claims.id);
    if (!user) return notFound(c, "user not found");

    await store.setUserPassword(claims.id, await hashPassword(body.password));
    return okPlain(c);
  });

  // ── Forgot password ───────────────────────────────────

  authRoutes.post("/forgot-password", async (c) => {
    const body = await c.req.json<{ email?: string }>().catch(() => null);
    if (!body?.email) return badRequest(c, "email is required");

    const user = await store.findUserByEmail(body.email.trim().toLowerCase());
    if (!user) return okPlain(c);

    const rawToken = generateResetToken();
    await store.createResetToken(user.id, hashResetToken(rawToken), resetTokenExpiresAt());

    const isDev = process.env.NODE_ENV !== "production";
    console.info(`[reset-password] token for ${body.email}: ${rawToken}`);
    return ok(c, { ok: true, ...(isDev ? { token: rawToken } : {}) });
  });

  // ── Reset password ────────────────────────────────────

  authRoutes.post("/reset-password", async (c) => {
    const body = await c.req.json<{ token?: string; password?: string }>().catch(() => null);
    if (!body?.token || !body?.password || body.password.length < 8) {
      return badRequest(c, "invalid token or password (min 8 chars)");
    }

    const tokenHash = hashResetToken(body.token);
    const record = await store.findValidResetToken(tokenHash);
    if (!record) return badRequest(c, "token is invalid or expired");

    await store.consumeResetToken(record.id);
    await store.setUserPassword(record.userId, await hashPassword(body.password));
    return okPlain(c);
  });

  // ── Profile update ────────────────────────────────────

  authRoutes.patch("/profile", async (c) => {
    const authorization = c.req.header("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
    if (!token) return unauthorized(c);

    let claims;
    try { claims = await verifySessionToken(token); }
    catch { return invalidToken(c); }

    const body = await c.req.json<{ displayName?: string }>().catch(() => null);
    if (!body) return badRequest(c, "invalid body");

    const user = await store.updateUser(claims.id, { displayName: body.displayName });
    if (!user) return notFound(c, "user not found");

    return ok(c, {
      user: { id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl },
    });
  });

  // ── Change password ───────────────────────────────────

  authRoutes.post("/change-password", async (c) => {
    const authorization = c.req.header("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
    if (!token) return unauthorized(c);

    let claims;
    try { claims = await verifySessionToken(token); }
    catch { return invalidToken(c); }

    const body = await c.req.json<{ oldPassword?: string; newPassword?: string }>().catch(() => null);
    if (!body?.oldPassword || !body?.newPassword || body.newPassword.length < 8) {
      return badRequest(c, "oldPassword and newPassword (min 8 chars) are required");
    }

    const user = await store.findUserById(claims.id);
    if (!user) return notFound(c, "user not found");

    if (user.passwordHash) {
      const valid = await verifyPassword(body.oldPassword, user.passwordHash);
      if (!valid) return forbidden(c, "current password is incorrect");
    }

    await store.setUserPassword(claims.id, await hashPassword(body.newPassword));
    return okPlain(c);
  });

  // ── Delete account ────────────────────────────────────

  authRoutes.delete("/account", async (c) => {
    const authorization = c.req.header("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
    if (!token) return unauthorized(c);

    let claims;
    try { claims = await verifySessionToken(token); }
    catch { return invalidToken(c); }

    await store.revokeAllUserTokens(claims.id);
    await store.deleteUserAccount(claims.id);
    return okPlain(c);
  });

  return authRoutes;
}
