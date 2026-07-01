import type { GatewayConfig } from "./config";

const URL_PATTERN = /https?:\/\/[^\s"'<>]+/gi;

export function redactGatewayMessage(message: string, config: GatewayConfig): string {
  let result = message;
  result = result.replaceAll(config.gatewayUrl, "[gateway]");
  result = result.replaceAll(config.userApiKey, "[redacted]");
  result = result.replaceAll(config.adminApiKey, "[redacted]");
  result = result.replace(URL_PATTERN, "[url]");
  result = result.replace(/MODULAR_RAG_GATEWAY_URL/gi, "[config]");
  result = result.replace(/USER_API_KEY|ADMIN_API_KEY/gi, "[config]");
  return result;
}