import { Hono } from "hono";
import { createAuthRoutes } from "./routes/auth";
import { createAdminRoutes } from "./routes/admin";
import { createThreadRoutes } from "./routes/threads";
import { type AuthStore, getAuthStore } from "./db/store";
import { ensureAdminSeed } from "./services/rbac";

export function createApp(store: AuthStore = getAuthStore()) {
  const app = new Hono();

  app.onError((error, c) => {
    console.error("[auth-api]", error);
    return c.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      500,
    );
  });

  app.get("/health", (c) => c.json({ status: "ok" }));
  app.route("/auth", createAuthRoutes(store));
  app.route("/admin", createAdminRoutes(store));
  app.route("/threads", createThreadRoutes(store));

  return app;
}

export async function onAppReady(store: AuthStore = getAuthStore()) {
  await ensureAdminSeed(store);
}
