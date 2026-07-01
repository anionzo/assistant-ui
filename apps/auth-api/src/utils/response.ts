import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

// Flat response helpers — no { success, data } wrapper.
// All helpers return standard c.json() directly.

export interface AppVariables {
  requestId: string;
}

export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200): Response {
  return c.json(data, status);
}

export function created<T>(c: Context, data: T): Response {
  return c.json(data, 201);
}

export function okPlain(c: Context, status: ContentfulStatusCode = 200): Response {
  return c.json({ ok: true }, status);
}

export function badRequest(c: Context, message: string): Response {
  return c.json({ error: message }, 400);
}

export function unauthorized(c: Context, message = "missing bearer token"): Response {
  return c.json({ error: message }, 401);
}

export function invalidToken(c: Context, message = "invalid or expired token"): Response {
  return c.json({ error: message }, 401);
}

export function forbidden(c: Context, message: string, _code?: string): Response {
  return c.json({ error: message }, 403);
}

export function notFound(c: Context, message = "resource not found"): Response {
  return c.json({ error: message }, 404);
}

export function conflict(c: Context, message: string): Response {
  return c.json({ error: message }, 409);
}

export function internalError(c: Context, message = "internal server error"): Response {
  return c.json({ error: message }, 500);
}
