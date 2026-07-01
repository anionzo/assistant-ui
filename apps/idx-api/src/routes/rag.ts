import { Hono } from "hono";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import type { AuthStore } from "../db/store";
import { proxyToGateway } from "../gateway/client";
import {
  isSafeAudioRef,
  resolveAdminDocumentsRoute,
  resolveAdminFormsRoute,
  resolveUserFormsRoute,
  resolveUserRagRoute,
  resolveUserVoiceOutputRoute,
  validatePathSegments,
} from "../gateway/policy";
import { requireAuth, type AuthContext } from "../middleware/auth";
import { requireServiceAuth } from "../middleware/service-auth";
import { resolveUserPermissions } from "../services/rbac";
import { forbidden, notFound, unauthorized } from "../utils/response";
import type { AppVariables } from "../utils/response";

type RagVariables = AppVariables & {
  authStore?: AuthStore;
  auth?: AuthContext;
};

function adminRouteSuffix(path: string, family: "documents" | "forms"): string {
  const marker = `/admin/${family}/`;
  const index = path.indexOf(marker);
  if (index === -1) {
    return path.endsWith(`/admin/${family}`) ? "" : "";
  }
  return path.slice(index + marker.length);
}

function userFormsRouteSuffix(path: string): string {
  const marker = "/forms/";
  const index = path.indexOf(marker);
  if (index === -1) {
    return path.endsWith("/forms") ? "" : "";
  }
  return path.slice(index + marker.length);
}

async function requireRagPermission(c: Context<{ Variables: RagVariables }>, permission: string) {
  const auth = c.get("auth");
  if (!auth?.session) return unauthorized(c);

  const store = c.get("authStore");
  const permissions = await resolveUserPermissions(auth.session.id, store);
  if (!permissions.includes(permission)) {
    return forbidden(c, `missing permission: ${permission}`);
  }
  return null;
}

export function createRagRoutes(store: AuthStore) {
  const app = new Hono<{ Variables: RagVariables }>();

  app.use("*", requireServiceAuth);
  app.use("/admin/*", createMiddleware(async (c, next) => {
    c.set("authStore", store);
    await next();
  }));

  app.post("/chat/stream", async (c) => {
    const resolved = resolveUserRagRoute("chat.stream", c.req.method);
    if (!resolved) return notFound(c);

    const requestId = c.get("requestId");
    let body: string;
    try {
      body = await c.req.text();
    } catch {
      return c.json(
        {
          success: false,
          requestId,
          error: { code: "VALIDATION_ERROR", message: "Request body is required" },
        },
        400,
      );
    }

    return proxyToGateway({
      upstreamPath: resolved.upstreamPath,
      method: c.req.method,
      incomingHeaders: c.req.raw.headers,
      body,
      signal: c.req.raw.signal,
      credential: resolved.credential,
      requestId,
    });
  });

  app.post("/voice/stream", async (c) => {
    const resolved = resolveUserRagRoute("voice.stream", c.req.method);
    if (!resolved) return notFound(c);

    const requestId = c.get("requestId");
    let body: string;
    try {
      body = await c.req.text();
    } catch {
      return c.json(
        {
          success: false,
          requestId,
          error: { code: "VALIDATION_ERROR", message: "Request body is required" },
        },
        400,
      );
    }

    return proxyToGateway({
      upstreamPath: resolved.upstreamPath,
      method: c.req.method,
      incomingHeaders: c.req.raw.headers,
      body,
      signal: c.req.raw.signal,
      credential: resolved.credential,
      requestId,
    });
  });

  app.get("/voice/audio", async (c) => {
    const resolved = resolveUserRagRoute("voice.audio", c.req.method);
    if (!resolved) return notFound(c);

    const ref = c.req.query("ref");
    if (!ref || !isSafeAudioRef(ref)) {
      return c.json(
        {
          success: false,
          requestId: c.get("requestId"),
          error: { code: "VALIDATION_ERROR", message: "invalid audio ref" },
        },
        400,
      );
    }

    return proxyToGateway({
      upstreamPath: `${resolved.upstreamPath}?ref=${encodeURIComponent(ref)}`,
      method: "GET",
      incomingHeaders: c.req.raw.headers,
      signal: c.req.raw.signal,
      credential: resolved.credential,
      requestId: c.get("requestId"),
    });
  });

  app.get("/pipelines", async (c) => {
    const resolved = resolveUserRagRoute("pipelines", c.req.method);
    if (!resolved) return notFound(c);

    return proxyToGateway({
      upstreamPath: resolved.upstreamPath,
      method: "GET",
      incomingHeaders: c.req.raw.headers,
      signal: c.req.raw.signal,
      credential: resolved.credential,
      requestId: c.get("requestId"),
    });
  });

  async function handleAdminDocuments(c: Context<{ Variables: RagVariables }>) {
    const suffix = adminRouteSuffix(c.req.path, "documents");
    const segments = suffix.split("/").filter(Boolean);
    const pathError = validatePathSegments(segments);
    if (pathError) {
      return c.json(
        {
          success: false,
          requestId: c.get("requestId"),
          error: { code: "VALIDATION_ERROR", message: pathError },
        },
        400,
      );
    }

    const resolved = resolveAdminDocumentsRoute(segments, c.req.method);
    if (!resolved) return notFound(c);

    const denied = await requireRagPermission(c, resolved.permission);
    if (denied) return denied;

    return proxyToGateway({
      upstreamPath: resolved.upstreamPath,
      method: c.req.method,
      incomingHeaders: c.req.raw.headers,
      body: c.req.raw.body,
      signal: c.req.raw.signal,
      credential: resolved.credential,
      requestId: c.get("requestId"),
    });
  }

  async function handleAdminForms(c: Context<{ Variables: RagVariables }>) {
    const suffix = adminRouteSuffix(c.req.path, "forms");
    const segments = suffix.split("/").filter(Boolean);
    const pathError = validatePathSegments(segments);
    if (pathError) {
      return c.json(
        {
          success: false,
          requestId: c.get("requestId"),
          error: { code: "VALIDATION_ERROR", message: pathError },
        },
        400,
      );
    }

    const resolved = resolveAdminFormsRoute(segments, c.req.method);
    if (!resolved) return notFound(c);

    const denied = await requireRagPermission(c, resolved.permission);
    if (denied) return denied;

    const hasBody = !["GET", "HEAD"].includes(c.req.method.toUpperCase());
    return proxyToGateway({
      upstreamPath: resolved.upstreamPath,
      method: c.req.method,
      incomingHeaders: c.req.raw.headers,
      body: hasBody ? c.req.raw.body : undefined,
      signal: c.req.raw.signal,
      credential: resolved.credential,
      requestId: c.get("requestId"),
    });
  }

  async function handleUserForms(c: Context<{ Variables: RagVariables }>) {
    const suffix = userFormsRouteSuffix(c.req.path);
    const segments = suffix.split("/").filter(Boolean);
    const pathError = validatePathSegments(segments);
    if (pathError) {
      return c.json(
        {
          success: false,
          requestId: c.get("requestId"),
          error: { code: "VALIDATION_ERROR", message: pathError },
        },
        400,
      );
    }

    const resolved = resolveUserFormsRoute(segments, c.req.method);
    if (!resolved) return notFound(c);

    const hasBody = !["GET", "HEAD"].includes(c.req.method.toUpperCase());
    return proxyToGateway({
      upstreamPath: resolved.upstreamPath,
      method: c.req.method,
      incomingHeaders: c.req.raw.headers,
      body: hasBody ? c.req.raw.body : undefined,
      signal: c.req.raw.signal,
      credential: resolved.credential,
      requestId: c.get("requestId"),
    });
  }

  app.get("/voice/output/:file", async (c) => {
    const file = c.req.param("file");
    const resolved = resolveUserVoiceOutputRoute(file, c.req.method);
    if (!resolved) {
      return c.json(
        {
          success: false,
          requestId: c.get("requestId"),
          error: { code: "VALIDATION_ERROR", message: "invalid output file" },
        },
        400,
      );
    }

    return proxyToGateway({
      upstreamPath: resolved.upstreamPath,
      method: "GET",
      incomingHeaders: c.req.raw.headers,
      signal: c.req.raw.signal,
      credential: resolved.credential,
      requestId: c.get("requestId"),
    });
  });

  app.all("/forms", handleUserForms);
  app.all("/forms/*", handleUserForms);

  app.use("/admin/documents/*", requireAuth);
  app.all("/admin/documents/*", handleAdminDocuments);

  app.use("/admin/forms", requireAuth);
  app.all("/admin/forms", handleAdminForms);
  app.use("/admin/forms/*", requireAuth);
  app.all("/admin/forms/*", handleAdminForms);

  return app;
}