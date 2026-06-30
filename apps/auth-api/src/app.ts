import { Hono } from "hono";
import { createAuthRoutes } from "./routes/auth";
import { type AuthStore, getAuthStore } from "./db/store";

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

  return app;
}
