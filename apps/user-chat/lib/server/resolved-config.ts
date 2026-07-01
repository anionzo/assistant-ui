import { getServerConfig, type ResolvedServerConfig } from "@/lib/server/config";
import { fetchPublicAppConfig } from "@/lib/server/public-app-config";

export async function getResolvedServerConfig(): Promise<ResolvedServerConfig> {
  const env = getServerConfig();
  const appConfig = await fetchPublicAppConfig();
  return {
    ...env,
    tenantId: appConfig.chatRuntime.tenantId,
    tenantDisplayName: appConfig.chatRuntime.tenantDisplayName,
    defaultCorpusId: appConfig.chatRuntime.defaultCorpusId,
    defaultChatPipeline: appConfig.chatRuntime.defaultChatPipeline,
    defaultVoicePipeline: appConfig.chatRuntime.defaultVoicePipeline,
    defaultTopK: appConfig.chatRuntime.defaultTopK,
  };
}