import { APP_CONFIG_FALLBACKS } from "@/lib/app-config-fallbacks";
import { getAdminConfig } from "@/lib/server/config";

export type PublicAppConfig = {
  branding: {
    logoUrl: string;
    admin: { appName: string; tagline: string };
    user: { appName: string; tagline: string };
  };
  chatRuntime: {
    tenantId: string;
    tenantDisplayName: string;
    defaultCorpusId: string;
    defaultChatPipeline: string;
    defaultVoicePipeline: string;
    defaultTopK: number;
  };
};

export async function fetchPublicAppConfig(): Promise<PublicAppConfig> {
  const { idxApiUrl } = getAdminConfig();

  try {
    const response = await fetch(`${idxApiUrl}/public/app-config`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return APP_CONFIG_FALLBACKS;

    const payload = (await response.json()) as {
      data?: Partial<PublicAppConfig>;
    } & Partial<PublicAppConfig>;

    const data = payload.data ?? payload;
    return {
      branding: {
        logoUrl: data.branding?.logoUrl?.trim() || APP_CONFIG_FALLBACKS.branding.logoUrl,
        admin: {
          appName: data.branding?.admin?.appName?.trim() || APP_CONFIG_FALLBACKS.branding.admin.appName,
          tagline: data.branding?.admin?.tagline?.trim() || APP_CONFIG_FALLBACKS.branding.admin.tagline,
        },
        user: {
          appName: data.branding?.user?.appName?.trim() || APP_CONFIG_FALLBACKS.branding.user.appName,
          tagline: data.branding?.user?.tagline?.trim() || APP_CONFIG_FALLBACKS.branding.user.tagline,
        },
      },
      chatRuntime: {
        tenantId: data.chatRuntime?.tenantId?.trim() || APP_CONFIG_FALLBACKS.chatRuntime.tenantId,
        tenantDisplayName:
          data.chatRuntime?.tenantDisplayName?.trim() || APP_CONFIG_FALLBACKS.chatRuntime.tenantDisplayName,
        defaultCorpusId:
          data.chatRuntime?.defaultCorpusId?.trim() || APP_CONFIG_FALLBACKS.chatRuntime.defaultCorpusId,
        defaultChatPipeline:
          data.chatRuntime?.defaultChatPipeline?.trim() || APP_CONFIG_FALLBACKS.chatRuntime.defaultChatPipeline,
        defaultVoicePipeline:
          data.chatRuntime?.defaultVoicePipeline?.trim() || APP_CONFIG_FALLBACKS.chatRuntime.defaultVoicePipeline,
        defaultTopK: data.chatRuntime?.defaultTopK ?? APP_CONFIG_FALLBACKS.chatRuntime.defaultTopK,
      },
    };
  } catch {
    return APP_CONFIG_FALLBACKS;
  }
}