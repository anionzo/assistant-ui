export type AdminConfig = {
  idxApiUrl: string;
  idxServiceSecret: string;
  authApiUrl: string;
  frontendUrl: string;
};

export function getAdminConfig(
  env: Record<string, string | undefined> = process.env,
): AdminConfig {
  const authApiUrl = env.IDX_API_URL?.replace(/\/$/, "");
  if (!authApiUrl) throw new Error("IDX_API_URL is required");
  const idxApiUrl = env.IDX_API_INTERNAL_URL?.replace(/\/$/, "") ?? authApiUrl;
  const idxServiceSecret = env.IDX_SERVICE_SECRET;
  if (!idxServiceSecret) {
    throw new Error("IDX_SERVICE_SECRET is required");
  }

  return {
    idxApiUrl,
    idxServiceSecret,
    authApiUrl,
    frontendUrl: env.FRONTEND_URL ?? "http://localhost:3002",
  };
}
