export type ServerConfig = {
  gatewayUrl: string;
  userApiKey: string;
  tenantId: string;
  tenantDisplayName: string;
  defaultCorpusId: string;
  defaultChatPipeline: string;
  defaultVoicePipeline: string;
  defaultTopK: number;
  authApiUrl: string;
  authRequired: boolean;
  jwtSecret?: string;
  frontendUrl: string;
};

export function getServerConfig(
  env: Record<string, string | undefined> = process.env,
): ServerConfig {
  const gatewayUrl = env.MODULAR_RAG_GATEWAY_URL?.replace(/\/$/, "");
  const userApiKey = env.USER_API_KEY;
  if (!gatewayUrl) throw new Error("MODULAR_RAG_GATEWAY_URL is required");
  if (!userApiKey) throw new Error("USER_API_KEY is required");

  const defaultTopK = Number(env.DEFAULT_TOP_K ?? 5);
  if (!Number.isInteger(defaultTopK) || defaultTopK < 1) {
    throw new Error("DEFAULT_TOP_K must be a positive integer");
  }

  const authRequired = env.AUTH_REQUIRED === "true";
  const jwtSecret = env.JWT_SECRET;
  if (authRequired && !jwtSecret) {
    throw new Error("JWT_SECRET is required when AUTH_REQUIRED=true");
  }

  return {
    gatewayUrl,
    userApiKey,
    tenantId: env.TENANT_ID ?? "huit_admission_chatbot",
    tenantDisplayName: env.TENANT_DISPLAY_NAME ?? "HUIT Admission Chatbot",
    defaultCorpusId: env.DEFAULT_CORPUS_ID ?? "admission-chatbot-corpus",
    defaultChatPipeline: env.DEFAULT_CHAT_PIPELINE ?? "huit_chat_multi_query_prod",
    defaultVoicePipeline: env.DEFAULT_VOICE_PIPELINE ?? "huit_voice_multi_query_prod",
    defaultTopK,
    authApiUrl: env.AUTH_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000",
    authRequired,
    jwtSecret,
    frontendUrl: env.FRONTEND_URL ?? "http://localhost:3001",
  };
}

export function publicConfig(config: ServerConfig) {
  return {
    tenantId: config.tenantId,
    tenantDisplayName: config.tenantDisplayName,
    defaultCorpusId: config.defaultCorpusId,
    defaultChatPipeline: config.defaultChatPipeline,
    defaultVoicePipeline: config.defaultVoicePipeline,
    defaultTopK: config.defaultTopK,
    authRequired: config.authRequired,
  };
}
