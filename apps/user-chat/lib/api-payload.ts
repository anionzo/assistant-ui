export function apiErrorMessage(payload: Record<string, unknown>): string | null {
  const error = payload.error;
  if (typeof error === "string") return error;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return null;
}

export function unwrapApiData<T>(payload: Record<string, unknown>): T {
  if (payload.success === true && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
}