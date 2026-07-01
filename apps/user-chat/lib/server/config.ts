export type ServerConfig = {
  idxApiUrl: string;
  idxServiceSecret: string;
  authApiUrl: string;
  authRequired: boolean;
  allowGuestChat: boolean;
  jwtSecret?: string;
  frontendUrl: string;
};

export type ResolvedServerConfig = ServerConfig & {
  tenantId: string;
  tenantDisplayName: string;
  defaultCorpusId: string;
  defaultChatPipeline: string;
  defaultVoicePipeline: string;
  defaultTopK: number;
};

export function getServerConfig(
  env: Record<string, string | undefined> = process.env,
): ServerConfig {
  const idxApiUrl =
    env.IDX_API_URL?.replace(/\/$/, "") ??
    env.AUTH_API_URL?.replace(/\/$/, "") ??
    "http://localhost:4000";
  const idxServiceSecret = env.IDX_SERVICE_SECRET;
  if (!idxServiceSecret) throw new Error("IDX_SERVICE_SECRET is required");

  const authRequired = env.AUTH_REQUIRED === "true";
  const jwtSecret = env.JWT_SECRET;
  if (authRequired && !jwtSecret) {
    throw new Error("JWT_SECRET is required when AUTH_REQUIRED=true");
  }

  const allowGuestChat =
    env.ALLOW_GUEST_CHAT === "true" ||
    (env.ALLOW_GUEST_CHAT !== "false" && !authRequired);

  return {
    idxApiUrl,
    idxServiceSecret,
    authApiUrl: idxApiUrl,
    authRequired,
    allowGuestChat,
    jwtSecret,
    frontendUrl: env.FRONTEND_URL ?? "http://localhost:3001",
  };
}

export function publicConfig(
  config: ServerConfig,
  env: Record<string, string | undefined> = process.env,
) {
  return {
    authRequired: config.authRequired,
    allowGuestChat: config.allowGuestChat,
    showRuntimeToolbar: env.SHOW_RUNTIME_TOOLBAR === "true",
  };
}