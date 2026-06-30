import { errorResponse } from "@/lib/server/errors";
import { getAdminConfig } from "@/lib/server/config";
import { requireAdminPermission } from "@/lib/server/require-admin-session";
import { P } from "@/lib/auth/permissions";
import { asArray } from "@/lib/api/bff";
import type { Collection } from "@/lib/types/gateway";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    const session = await requireAdminPermission(P.COLLECTIONS_READ);
    if (!session.ok) {
      return Response.json({ error: session.error }, { status: session.status });
    }

    const config = getAdminConfig();
    let collections: Collection[] = [];

    try {
      const response = await fetch(
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
      if (response.ok) {
        const payload = await response.json();
        collections = asArray<Collection>(payload, ["collections", "items", "data"]);
      }
    } catch {
      // Config remains usable when catalog is temporarily unavailable.
    }

    return Response.json({
      collections,
      gatewayUrl: config.gatewayUrl.replace(/\/\/.*@/, "//***@"),
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