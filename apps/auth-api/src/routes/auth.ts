import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { oauthAccounts, users } from "../db/schema";
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

export const authRoutes = new Hono();

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

  const db = getDb();
  const profile = await exchangeGoogleCode(code, state);
  const existingOAuth = (await db
    .select()
    .from(oauthAccounts)
    .where(and(eq(oauthAccounts.provider, "google"), eq(oauthAccounts.providerAccountId, profile.sub)))
    .limit(1))[0];

  let user = existingOAuth
    ? (await db.select().from(users).where(eq(users.id, existingOAuth.userId)).limit(1))[0] ?? null
    : null;

  if (!user) {
    const existingUser = (await db
      .select()
      .from(users)
      .where(eq(users.email, normalizeEmail(profile.email)))
      .limit(1))[0];

    if (existingUser) {
      user = existingUser;
      await db.insert(oauthAccounts).values({
        provider: "google",
        providerAccountId: profile.sub,
        userId: existingUser.id,
      });
    } else {
      const createdUsers = await db.insert(users).values({
        email: normalizeEmail(profile.email),
        displayName: profile.name,
        avatarUrl: profile.picture,
      }).returning();
      user = createdUsers[0] ?? null;

      if (user) {
        await db.insert(oauthAccounts).values({
          provider: "google",
          providerAccountId: profile.sub,
          userId: user.id,
        });
      }
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

  const db = getDb();
  const email = normalizeEmail(body.email);
  const existingUser = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  if (existingUser) {
    return c.json({ error: "email is already registered" }, 409);
  }

  const createdUsers = await db.insert(users).values({
    email,
    passwordHash: await hashPassword(body.password),
    displayName: body.displayName?.trim() || null,
  }).returning();
  const user = createdUsers[0];

  return c.json(await issueSession(toSessionUser(user)), 201);
});

authRoutes.post("/login", async (c) => {
  const body = await c.req.json<LoginBody>().catch(() => null);
  if (!body?.email || !body.password) {
    return c.json({ error: "email and password are required" }, 400);
  }

  const db = getDb();
  const user = (await db
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(body.email)))
    .limit(1))[0];
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
