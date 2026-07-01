import { errorResponse } from "@/lib/server/errors";
import { fetchIdxRag } from "@/lib/server/idx-api-rag";
import { fetchPublicAppConfig } from "@/lib/server/public-app-config";
import { getServerConfig, publicConfig } from "@/lib/server/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    const env = getServerConfig();
    const appConfig = await fetchPublicAppConfig();
    let pipelines: unknown[] = [];

    try {
      const response = await fetchIdxRag({
        path: "/rag/pipelines",
        requestId,
        signal: AbortSignal.timeout(3_000),
      });
      if (response.ok) {
        const payload = (await response.json()) as unknown;
        pipelines = Array.isArray(payload)
          ? payload
          : payload && typeof payload === "object" && "pipelines" in payload
            ? ((payload as { pipelines?: unknown[] }).pipelines ?? [])
            : [];
      }
    } catch {
      // Runtime config remains usable when the optional catalog is unavailable.
    }

    return Response.json({
      ...publicConfig(env),
      tenantId: appConfig.chatRuntime.tenantId,
      tenantDisplayName: appConfig.chatRuntime.tenantDisplayName,
      defaultCorpusId: appConfig.chatRuntime.defaultCorpusId,
      defaultChatPipeline: appConfig.chatRuntime.defaultChatPipeline,
      defaultVoicePipeline: appConfig.chatRuntime.defaultVoicePipeline,
      defaultTopK: appConfig.chatRuntime.defaultTopK,
      branding: appConfig.branding.user,
      pipelines,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Invalid server configuration",
      "configuration_error",
      500,
      requestId,
    );
  }
}