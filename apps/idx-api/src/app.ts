import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { createAuthRoutes } from "./routes/auth";
import { createAdminRoutes } from "./routes/admin";
import { createRagRoutes } from "./routes/rag";
import { createInternalRoutes } from "./routes/internal";
import { createPublicRoutes } from "./routes/public";
import { createThreadRoutes } from "./routes/threads";
import { createVoiceFormSessionRoutes } from "./routes/voice-form-sessions";
import { ensureMongoBootstrap } from "./db/mongo/bootstrap";
import { type AuthStore, getAuthStore } from "./db/store";
import { ensureAdminSeed } from "./services/rbac";
import { logHttpRequest, pushOpsLog } from "./services/ops-log";
import { ErrorCode } from "./utils/errors";
import { ok, type AppVariables } from "./utils/response";

export function createApp(store: AuthStore = getAuthStore()) {
  const app = new Hono<{ Variables: AppVariables }>();

  app.use(
    "*",
    createMiddleware(async (c, next) => {
      const started = Date.now();
      c.set("requestId", c.req.header("x-request-id") ?? crypto.randomUUID());
      c.res.headers.set("x-request-id", c.get("requestId"));
      await next();
      try {
        logHttpRequest({
          method: c.req.method,
          path: c.req.path,
          status: c.res.status,
          durationMs: Date.now() - started,
          requestId: c.get("requestId"),
        });
      } catch {
        // never break the response for logging
      }
    }),
  );

  app.onError((error, c) => {
    console.error("[idx-api]", error);
    const requestId = c.get("requestId") ?? crypto.randomUUID();
    pushOpsLog({
      level: "error",
      source: "app",
      message: error instanceof Error ? error.message : "Internal Server Error",
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: 500,
      detail: error instanceof Error ? error.stack?.slice(0, 800) : undefined,
    });
    return c.json(
      {
        success: false,
        requestId,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message:
            error instanceof Error ? error.message : "Internal Server Error",
        },
      },
      500,
    );
  });

  app.get("/health", (c) => ok(c, { status: "ok", service: "idx-api" }));
  app.get("/health/rag", (c) => {
    try {
      const hasGateway =
        !!process.env.MODULAR_RAG_GATEWAY_URL &&
        !!process.env.USER_API_KEY &&
        !!process.env.ADMIN_API_KEY;
      return ok(c, { status: hasGateway ? "configured" : "missing_config", service: "idx-api-rag" });
    } catch {
      return ok(c, { status: "error", service: "idx-api-rag" });
    }
  });
  app.use("/admin/*", createMiddleware(async (c, next) => {
    (c as any).set("authStore", store);
    await next();
  }));
  app.route("/auth", createAuthRoutes(store));
  app.route("/admin", createAdminRoutes(store));
  app.route("/rag", createRagRoutes(store));
  app.route("/threads", createThreadRoutes(store));
  app.route("/voice-form/sessions", createVoiceFormSessionRoutes(store));
  app.route("/internal", createInternalRoutes());
  app.route("/public", createPublicRoutes());

  return app;
}

export async function onAppReady(store: AuthStore = getAuthStore()) {
  await ensureMongoBootstrap();
  await ensureAdminSeed(store);
}
