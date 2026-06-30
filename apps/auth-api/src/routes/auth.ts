import { Hono } from "hono";
import { type AuthStore, getAuthStore } from "../db/store";
import { resolveUserPermissions, resolveUserRoles } from "../services/rbac";
import { createExchange, consumeExchange } from "../services/exchange-store";
import { createGoogleAuthUrl, exchangeGoogleCode } from "../services/google-oauth";
import { signSessionToken, verifySessionToken, type SessionUser } from "../services/jwt";
import { hashPassword, verifyPassword } from "../services/password";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiresAt,
} from "../services/refresh-token";

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
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    roleIds: [],
  };
}

export function createAuthRoutes(store: AuthStore = getAuthStore()) {
  const authRoutes = new Hono();

  async function issueSession(user: SessionUser) {
    const [roleIds, resolvedRoles] = await Promise.all([
      resolveUserRoles(user.id, store).then((roles) => roles.map((r) => r.id)),
      resolveUserRoles(user.id, store),
    ]);
    const permissionCodes = await resolveUserPermissions(user.id, store);

    const accessToken = await signSessionToken({
      ...user,
      roleIds,
    });
    const refreshToken = generateRefreshToken();
    await store.createRefreshToken({
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshTokenExpiresAt(),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: Number(process.env.JWT_ACCESS_TTL ?? 3600),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      roles: resolvedRoles.map((r) => ({ id: r.id, name: r.name })),
      permissions: permissionCodes,
    };
  }

  authRoutes.get("/google", (c) => {
    const returnTo = c.req.query("returnTo") ?? "/";
    const frontend = c.req.query("frontend") || undefined;
    const { url } = createGoogleAuthUrl(returnTo, frontend);
    return c.redirect(url, 302);
  });

  authRoutes.get("/google/callback", async (c) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    if (!code || !state) {
      return c.json({ error: "Missing Google callback parameters" }, 400);
    }

    let profile: Awaited<ReturnType<typeof exchangeGoogleCode>>;
    try {
      profile = await exchangeGoogleCode(code, state);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google OAuth callback failed";
      console.error("[auth-api][google-callback][exchange]", message);
      return c.json({ error: message }, 400);
    }

    let existingOAuth;
    try {
      existingOAuth = await store.findOAuthAccount("google", profile.sub);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load Google account link";
      console.error("[auth-api][google-callback][lookup-oauth]", message);
      return c.json({ error: message }, 500);
    }

    let user = existingOAuth ? await store.findUserById(existingOAuth.userId) : null;

    if (!user) {
      const existingUser = await store.findUserByEmail(normalizeEmail(profile.email));

      if (existingUser) {
        user = existingUser;
        await store.createOAuthAccount({
          provider: "google",
          providerAccountId: profile.sub,
          userId: existingUser.id,
        });
      } else {
        user = await store.createUser({
          email: normalizeEmail(profile.email),
          displayName: profile.name,
          avatarUrl: profile.picture,
        });

        await store.createOAuthAccount({
          provider: "google",
          providerAccountId: profile.sub,
          userId: user.id,
        });
      }
    }

    if (!user) {
      return c.json({ error: "Unable to create Google session" }, 500);
    }

    // Auto-assign super_admin if email matches ADMIN_SEED_EMAIL
    const seedEmail = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
    if (seedEmail && normalizeEmail(user.email) === seedEmail) {
      await store.ensureUserRole(user.id, "super_admin");
    }

    const sessionUser = toSessionUser(user);
    const session = await issueSession(sessionUser);
    const exchangeCode = createExchange(
      session.accessToken,
      session.refreshToken,
      sessionUser,
      session.roles,
      session.permissions,
    );
    const frontendUrl = profile.frontend;

    return c.redirect(`${frontendUrl}/api/auth/callback?exchange=${encodeURIComponent(exchangeCode)}&returnTo=${encodeURIComponent(profile.returnTo)}`, 302);
  });

  authRoutes.post("/exchange", async (c) => {
    const body = await c.req.json<{ code?: string }>().catch(() => null);
    if (!body?.code) {
      return c.json({ error: "code is required" }, 400);
    }

    const exchange = consumeExchange(body.code);
    if (!exchange) {
      return c.json({ error: "exchange code is invalid or expired" }, 400);
    }

    return c.json({
      accessToken: exchange.accessToken,
      refreshToken: exchange.refreshToken,
      expiresIn: Number(process.env.JWT_ACCESS_TTL ?? 3600),
      user: exchange.user,
      roles: exchange.roles,
      permissions: exchange.permissions,
    });
  });

  authRoutes.post("/refresh", async (c) => {
    const body = await c.req.json<{ refreshToken?: string }>().catch(() => null);
    if (!body?.refreshToken) {
      return c.json({ error: "refreshToken is required" }, 400);
    }

    const tokenHash = hashRefreshToken(body.refreshToken);
    const record = await store.findValidRefreshToken(tokenHash);
    if (!record) {
      return c.json({ error: "refresh token is invalid or expired" }, 401);
    }

    const user = await store.findUserById(record.userId);
    if (!user) {
      return c.json({ error: "refresh token is invalid or expired" }, 401);
    }

    await store.revokeRefreshToken(tokenHash);
    return c.json(await issueSession(toSessionUser(user)));
  });

  authRoutes.post("/register", async (c) => {
    const body = await c.req.json<LoginBody>().catch(() => null);
    if (!body?.email || !body.password) {
      return c.json({ error: "email and password are required" }, 400);
    }

    const email = normalizeEmail(body.email);
    const existingUser = await store.findUserByEmail(email);
    if (existingUser) {
      return c.json({ error: "email is already registered" }, 409);
    }

    const user = await store.createUser({
      email,
      passwordHash: await hashPassword(body.password),
      displayName: body.displayName?.trim() || null,
    });

    // Auto-assign super_admin if email matches ADMIN_SEED_EMAIL
    const seedEmail = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
    if (seedEmail && email === seedEmail) {
      await store.ensureUserRole(user.id, "super_admin");
    }

    return c.json(await issueSession(toSessionUser(user)), 201);
  });

  authRoutes.post("/login", async (c) => {
    const body = await c.req.json<LoginBody>().catch(() => null);
    if (!body?.email || !body.password) {
      return c.json({ error: "email and password are required" }, 400);
    }

    const user = await store.findUserByEmail(normalizeEmail(body.email));
    if (!user?.passwordHash) {
      return c.json({ error: "invalid email or password" }, 401);
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      return c.json({ error: "invalid email or password" }, 401);
    }

    return c.json(await issueSession(toSessionUser(user)));
  });

  authRoutes.get("/me", async (c) => {
    const authorization = c.req.header("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
    if (!token) {
      return c.json({ error: "missing bearer token" }, 401);
    }

    try {
      const claims = await verifySessionToken(token);
      const [roles, permissions] = await Promise.all([
        resolveUserRoles(claims.id, store),
        resolveUserPermissions(claims.id, store),
      ]);
      return c.json({
        user: {
          id: claims.id,
          email: claims.email,
          displayName: claims.displayName,
          avatarUrl: claims.avatarUrl,
        },
        roles: roles.map((r) => ({ id: r.id, name: r.name })),
        permissions,
      });
    } catch {
      return c.json({ error: "invalid bearer token" }, 401);
    }
  });

  authRoutes.post("/logout", async (c) => {
    const body = await c.req.json<{ refreshToken?: string }>().catch(() => null);
    if (body?.refreshToken) {
      await store.revokeRefreshToken(hashRefreshToken(body.refreshToken));
    }
    return c.json({ ok: true });
  });

  // POST /auth/set-password — allow OAuth users to set a password
  authRoutes.post("/set-password", async (c) => {
    const authorization = c.req.header("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
    if (!token) {
      return c.json({ error: "missing bearer token" }, 401);
    }

    let claims;
    try {
      claims = await verifySessionToken(token);
    } catch {
      return c.json({ error: "invalid or expired token" }, 401);
    }

    const body = await c.req.json<{ password?: string }>().catch(() => null);
    if (!body?.password || body.password.length < 8) {
      return c.json({ error: "password must be at least 8 characters" }, 400);
    }

    const user = await store.findUserById(claims.id);
    if (!user) {
      return c.json({ error: "user not found" }, 404);
    }

    await store.setUserPassword(claims.id, await hashPassword(body.password));
    return c.json({ ok: true });
  });

  return authRoutes;
}
