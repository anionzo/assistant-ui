import { asArray } from "@/lib/api/bff";
import { getAdminConfig } from "@/lib/server/config";
import { errorResponse } from "@/lib/server/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    const config = getAdminConfig();
    let gatewayOk = false;
    let message = "";
    let collectionCount = 0;

    try {
      const health = await fetch(`${config.gatewayUrl}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(3_000),
      });
      gatewayOk = health.ok;
      if (!health.ok) message = `Health ${health.status}`;
    } catch (error) {
      message = error instanceof Error ? error.message : "Gateway unreachable";
    }

    if (!message) {
      try {
        const catalog = await fetch(
          `${config.gatewayUrl}/document-processing/compat/collections`,
          {
            headers: {
              "X-API-Key": config.adminApiKey,
              "X-Request-ID": requestId,
            },
            cache: "no-store",
            signal: AbortSignal.timeout(5_000),
          },
        );
        if (catalog.status === 403) {
          message = "ADMIN_API_KEY rejected (403)";
        } else if (!catalog.ok) {
          message = `Catalog ${catalog.status}`;
        } else {
          gatewayOk = true;
          const payload = await catalog.json();
          collectionCount = asArray(payload, ["collections", "items", "data"]).length;
        }
      } catch (error) {
        message = error instanceof Error ? error.message : "Catalog unreachable";
      }
    }

    return Response.json({
      gateway: gatewayOk ? "ok" : "error",
      message: message || undefined,
      collectionCount,
      gatewayHost: new URL(config.gatewayUrl).host,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Invalid admin configuration",
      "configuration_error",
      500,
      requestId,
    );
  }
}