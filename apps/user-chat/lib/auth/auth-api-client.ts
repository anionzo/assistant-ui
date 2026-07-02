import { apiErrorMessage, unwrapApiData } from "@/lib/api-payload";
import { getServerConfig } from "@/lib/server/config";

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
  const config = getServerConfig();
  const response = await fetch(`${config.idxApiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: apiErrorMessage(payload) ?? "Auth API request failed",
    };
  }

  return { ok: true, data: unwrapApiData<T>(payload) };
}
