import { vi } from "vitest";
import { APP_CONFIG_FALLBACKS } from "@/lib/app-config-fallbacks";
import type { ResolvedServerConfig } from "@/lib/server/config";
import * as resolvedConfig from "@/lib/server/resolved-config";
import { invalidatePublicAppConfigCache } from "@/lib/server/public-app-config";

export function mockResolvedServerConfig(
  overrides: Partial<ResolvedServerConfig> = {},
): ReturnType<typeof vi.spyOn> {
  invalidatePublicAppConfigCache();
  return vi.spyOn(resolvedConfig, "getResolvedServerConfig").mockResolvedValue({
    idxApiUrl: "http://localhost:4000",
    idxServiceSecret: "service-secret",
    authApiUrl: "http://localhost:4000",
    authRequired: false,
    allowGuestChat: true,
    frontendUrl: "http://localhost:3001",
    tenantId: APP_CONFIG_FALLBACKS.chatRuntime.tenantId,
    tenantDisplayName: APP_CONFIG_FALLBACKS.chatRuntime.tenantDisplayName,
    defaultCorpusId: APP_CONFIG_FALLBACKS.chatRuntime.defaultCorpusId,
    defaultChatPipeline: APP_CONFIG_FALLBACKS.chatRuntime.defaultChatPipeline,
    defaultVoicePipeline: APP_CONFIG_FALLBACKS.chatRuntime.defaultVoicePipeline,
    defaultTopK: APP_CONFIG_FALLBACKS.chatRuntime.defaultTopK,
    ...overrides,
  });
}