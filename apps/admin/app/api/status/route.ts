import { asArray } from "@/lib/api/bff";
import { getAdminConfig } from "@/lib/server/config";
import { IDX_SERVICE_AUTH_HEADER } from "@/lib/server/gateway-proxy";
import { errorResponse } from "@/lib/server/errors";
import { requireAdminPermission } from "@/lib/server/require-admin-session";
import { P } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    const session = await requireAdminPermission(P.COLLECTIONS_READ);
    if (!session.ok) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    const config = getAdminConfig();
    let gatewayOk = false;
    let message = "";
    let collectionCount = 0;

    try {
      const health = await fetch(`${config.idxApiUrl}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(3_000),
      });
      gatewayOk = health.ok;
      if (!health.ok) message = `Idx API health ${health.status}`;
    } catch (error) {
      message = error instanceof Error ? error.message : "Idx API unreachable";
    }

    if (!message) {
      try {
        const catalog = await fetch(`${config.idxApiUrl}/rag/admin/documents/collections`, {
          headers: {
            [IDX_SERVICE_AUTH_HEADER]: config.idxServiceSecret,
            Authorization: `Bearer ${session.session.accessToken}`,
            "X-Request-ID": requestId,
          },
          cache: "no-store",
          signal: AbortSignal.timeout(5_000),
        });
        if (catalog.status === 403) {
          message = "Admin RAG access denied (403)";
        } else if (!catalog.ok) {
          message = `Catalog ${catalog.status}`;
        } else {
          gatewayOk = true;
          const payload = await catalog.json().catch(() => ({}));
          const items = asArray<{ length: number }>(payload, ["collections", "items", "data"]);
          collectionCount = Array.isArray(items) ? items.length : 0;
        }
      } catch (error) {
        message = error instanceof Error ? error.message : "Catalog unreachable";
      }
    }

    let gatewayHost = "";
    try {
      gatewayHost = new URL(config.idxApiUrl).host;
    } catch {
      gatewayHost = config.idxApiUrl || "unknown";
    }

    return Response.json({
      gateway: gatewayOk ? "ok" : "error",
      message: message || undefined,
      collectionCount,
      gatewayHost,
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