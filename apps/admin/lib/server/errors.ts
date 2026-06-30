export type ErrorCode =
  | "gateway_error"
  | "validation_error"
  | "configuration_error"
  | "missing_session"
  | "forbidden";

export function errorResponse(
  message: string,
  code: ErrorCode,
  status: number,
  requestId = crypto.randomUUID(),
  details?: unknown,
) {
  return Response.json(
    { error: message, code, requestId, ...(details === undefined ? {} : { details }) },
    { status, headers: { "X-Request-ID": requestId } },
  );
}