import { Hono } from "hono";
import { type AuthStore, getAuthStore } from "../db/store";
import { createExchange, consumeExchange } from "../services/exchange-store";
import { createGoogleAuthUrl, exchangeGoogleCode } from "../services/google-oauth";
import { signSessionToken, verifySessionToken, type SessionUser } from "../services/jwt";
import { hashPassword, verifyPassword } from "../services/password";

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
  };
}

async function issueSession(user: SessionUser) {
  const accessToken = await signSessionToken(user);
  return {
    accessToken,
    expiresIn: Number(process.env.JWT_ACCESS_TTL ?? 3600),
    user,
  };
}

export function createAuthRoutes(store: AuthStore = getAuthStore()) {
  const authRoutes = new Hono();

  authRoutes.get("/google", (c) => {
    const returnTo = c.req.query("returnTo") ?? "/";
    const { url } = createGoogleAuthUrl(returnTo);
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

    const sessionUser = toSessionUser(user);
    const accessToken = await signSessionToken(sessionUser);
    const exchangeCode = createExchange(accessToken, sessionUser);
    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3001";

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
      expiresIn: Number(process.env.JWT_ACCESS_TTL ?? 3600),
      user: exchange.user,
    });
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
      return c.json({
        user: {
          id: claims.id,
          email: claims.email,
          displayName: claims.displayName,
          avatarUrl: claims.avatarUrl,
        },
      });
    } catch {
      return c.json({ error: "invalid bearer token" }, 401);
    }
  });

  authRoutes.post("/logout", (c) => {
    return c.json({ ok: true });
  });

  return authRoutes;
}
