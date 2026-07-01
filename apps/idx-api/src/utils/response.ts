import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export interface AppVariables {
  requestId: string;
}

function rid(c: Context): string {
  return c.get("requestId") ?? crypto.randomUUID();
}

export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200 as ContentfulStatusCode): Response {
  return c.json({ success: true, requestId: rid(c), data }, status);
}

export function created<T>(c: Context, data: T): Response {
  return ok(c, data, 201);
}

export function okPlain(c: Context, status: ContentfulStatusCode = 200): Response {
  return c.json({ success: true, requestId: rid(c) }, status);
}

function fail(c: Context, message: string, status: ContentfulStatusCode): Response {
  return c.json({ success: false, requestId: rid(c), error: { message } }, status);
}

export function badRequest(c: Context, message: string): Response {
  return fail(c, message, 400);
}

export function unauthorized(c: Context, message = "missing bearer token"): Response {
  return fail(c, message, 401);
}

export function invalidToken(c: Context, message = "invalid or expired token"): Response {
  return fail(c, message, 401);
}

export function forbidden(c: Context, message: string, _code?: string): Response {
  return fail(c, message, 403);
}

export function notFound(c: Context, message = "resource not found"): Response {
  return fail(c, message, 404);
}

export function conflict(c: Context, message: string): Response {
  return fail(c, message, 409);
}

export function internalError(c: Context, message = "internal server error"): Response {
  return fail(c, message, 500);
}
