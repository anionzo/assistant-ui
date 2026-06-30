export type AdminConfig = {
  gatewayUrl: string;
  adminApiKey: string;
};

export function getAdminConfig(
  env: Record<string, string | undefined> = process.env,
): AdminConfig {
  const gatewayUrl = (env.MODULAR_RAG_GATEWAY_URL ?? env.GATEWAY_BASE_URL)?.replace(/\/$/, "");
  const adminApiKey = env.ADMIN_API_KEY;
  if (!gatewayUrl) {
    throw new Error("MODULAR_RAG_GATEWAY_URL or GATEWAY_BASE_URL is required");
  }
  if (!adminApiKey) {
    throw new Error("ADMIN_API_KEY is required");
  }
  return { gatewayUrl, adminApiKey };
}