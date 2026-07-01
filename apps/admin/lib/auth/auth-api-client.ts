import { getAdminConfig } from "@/lib/server/config";

type AuthApiResult<T> = {
  ok: true;
  data: T;
} | {
  ok: false;
  status: number;
  error: string;
};

async function parseJson(response: Response) {
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}

export async function authApiFetch<T>(
  path: string,
  init: RequestInit,
): Promise<AuthApiResult<T>> {
  const config = getAdminConfig();
  const response = await fetch(`${config.authApiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    const errMsg =
      typeof (payload as any)?.error?.message === "string" ? (payload as any).error.message :
      typeof payload?.error === "string" ? payload.error as string :
      "Auth API request failed";
    return { ok: false, status: response.status, error: errMsg };
  }

  // Unwrap wrapper format: { success: true, data: {...} }
  const data = (payload as any).success === true && "data" in payload ? (payload as any).data : payload;
  return { ok: true, data: data as T };
}
