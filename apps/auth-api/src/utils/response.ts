import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { ErrorCode, type ErrorCode as ErrorCodeType } from "./errors";

export interface AppVariables {
  requestId: string;
}

export interface ApiError {
  code: ErrorCodeType;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  requestId: string;
  data?: T;
  error?: ApiError;
}

function getRequestId(c: Context): string {
  return (
    c.get("requestId") ??
    c.req.header("x-request-id") ??
    crypto.randomUUID()
  );
}

export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200): Response {
  return c.json({ success: true, requestId: getRequestId(c), data } satisfies ApiResponse<T>, status);
}

export function created<T>(c: Context, data: T): Response {
  return ok(c, data, 201);
}

export function okPlain(c: Context, status: ContentfulStatusCode = 200): Response {
  return c.json({ success: true, requestId: getRequestId(c) } satisfies ApiResponse, status);
}

export function fail(
  c: Context,
  code: ErrorCodeType,
  message: string,
  status: ContentfulStatusCode,
  details?: unknown,
): Response {
  return c.json(
    {
      success: false,
      requestId: getRequestId(c),
      error: { code, message, ...(details !== undefined ? { details } : {}) },
    } satisfies ApiResponse,
    status,
  );
}

export function badRequest(
  c: Context,
  message: string,
  details?: unknown,
): Response {
  return fail(c, ErrorCode.VALIDATION_ERROR, message, 400, details);
}

export function unauthorized(c: Context, message = "missing bearer token"): Response {
  return fail(c, ErrorCode.UNAUTHORIZED, message, 401);
}

export function invalidToken(c: Context, message = "invalid or expired token"): Response {
  return fail(c, ErrorCode.INVALID_TOKEN, message, 401);
}

export function forbidden(
  c: Context,
  message: string,
  code: ErrorCodeType = ErrorCode.FORBIDDEN,
): Response {
  return fail(c, code, message, 403);
}

export function notFound(c: Context, message = "resource not found"): Response {
  return fail(c, ErrorCode.NOT_FOUND, message, 404);
}

export function conflict(c: Context, message: string): Response {
  return fail(c, ErrorCode.CONFLICT, message, 409);
}

export function internalError(c: Context, message = "internal server error"): Response {
  return fail(c, ErrorCode.INTERNAL_ERROR, message, 500);
}
