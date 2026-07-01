export type GatewayConfig = {
  gatewayUrl: string;
  userApiKey: string;
  adminApiKey: string;
};

const SAFE_HEADER_NAMES = [
  "content-type",
  "accept",
  "accept-language",
  "x-tenant-id",
  "x-corpus-id",
  "x-chat-pipeline",
  "x-conversation-id",
  "x-voice-form-session",
] as const;

export function pickForwardHeaders(incoming: Headers): Headers {
  const headers = new Headers();
  for (const name of SAFE_HEADER_NAMES) {
    const value = incoming.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

export function getGatewayConfig(): GatewayConfig {
  const gatewayUrl = process.env.MODULAR_RAG_GATEWAY_URL?.replace(/\/$/, "");
  const userApiKey = process.env.USER_API_KEY;
  const adminApiKey = process.env.ADMIN_API_KEY;

  if (!gatewayUrl) throw new Error("MODULAR_RAG_GATEWAY_URL is required");
  if (!userApiKey) throw new Error("USER_API_KEY is required");
  if (!adminApiKey) throw new Error("ADMIN_API_KEY is required");

  return { gatewayUrl, userApiKey, adminApiKey };
}