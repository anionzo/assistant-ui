export function errorResponse(
  message: string,
  code: "gateway_error" | "validation_error" | "configuration_error" | "missing_session",
  status: number,
  requestId = crypto.randomUUID(),
  details?: unknown,
) {
  return Response.json(
    { error: message, code, requestId, ...(details === undefined ? {} : { details }) },
    { status, headers: { "X-Request-ID": requestId } },
  );
}
