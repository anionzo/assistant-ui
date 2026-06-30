import { errorResponse } from "@/lib/server/errors";
import { getServerConfig, publicConfig } from "@/lib/server/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    const config = getServerConfig();
    let pipelines: unknown[] = [];

    try {
      const response = await fetch(`${config.gatewayUrl}/pipelines`, {
        headers: {
          "X-API-Key": config.userApiKey,
          "X-Tenant-ID": config.tenantId,
          "X-Request-ID": requestId,
        },
        cache: "no-store",
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

    return Response.json({ ...publicConfig(config), pipelines });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Invalid server configuration",
      "configuration_error",
      500,
      requestId,
    );
  }
}
