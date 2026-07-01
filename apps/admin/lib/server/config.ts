export type AdminConfig = {
  idxApiUrl: string;
  idxServiceSecret: string;
  authApiUrl: string;
  frontendUrl: string;
};

export function getAdminConfig(
  env: Record<string, string | undefined> = process.env,
): AdminConfig {
  const idxApiUrl =
    env.IDX_API_URL?.replace(/\/$/, "") ??
    env.AUTH_API_URL?.replace(/\/$/, "") ??
    "http://localhost:4000";
  const idxServiceSecret = env.IDX_SERVICE_SECRET;
  if (!idxServiceSecret) {
    throw new Error("IDX_SERVICE_SECRET is required");
  }

  return {
    idxApiUrl,
    idxServiceSecret,
    authApiUrl: idxApiUrl,
    frontendUrl: env.FRONTEND_URL ?? "http://localhost:3002",
  };
}