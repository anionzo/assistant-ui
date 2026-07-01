import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { createAuthRoutes } from "./routes/auth";
import { createAdminRoutes } from "./routes/admin";
import { createThreadRoutes } from "./routes/threads";
import { type AuthStore, getAuthStore } from "./db/store";
import { ensureAdminSeed } from "./services/rbac";
import { ErrorCode } from "./utils/errors";
import { ok, type AppVariables } from "./utils/response";

export function createApp(store: AuthStore = getAuthStore()) {
  const app = new Hono<{ Variables: AppVariables }>();

  app.use(
    "*",
    createMiddleware(async (c, next) => {
      c.set("requestId", c.req.header("x-request-id") ?? crypto.randomUUID());
      c.res.headers.set("x-request-id", c.get("requestId"));
      await next();
    }),
  );

  app.onError((error, c) => {
    console.error("[auth-api]", error);
    return c.json(
      {
        success: false,
        requestId: c.get("requestId") ?? crypto.randomUUID(),
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message:
            error instanceof Error ? error.message : "Internal Server Error",
        },
      },
      500,
    );
  });

  app.get("/health", (c) => ok(c, { status: "ok" }));
  app.use("/admin/*", createMiddleware(async (c, next) => {
    (c as any).set("authStore", store);
    await next();
  }));
  app.route("/auth", createAuthRoutes(store));
  app.route("/admin", createAdminRoutes(store));
  app.route("/threads", createThreadRoutes(store));

  return app;
}

export async function onAppReady(store: AuthStore = getAuthStore()) {
  await ensureAdminSeed(store);
}
