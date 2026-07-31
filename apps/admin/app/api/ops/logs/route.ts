import { authApiFetch } from "@/lib/auth/auth-api-client";
import { requireAdminSession } from "@/lib/server/require-admin-session";

export const dynamic = "force-dynamic";

type OpsLogsPayload = {
  entries: Array<{
    id: string;
    ts: string;
    level: "info" | "warn" | "error";
    source: string;
    message: string;
    requestId?: string;
    method?: string;
    path?: string;
    status?: number;
    durationMs?: number;
    detail?: string;
  }>;
  total: number;
  capacity: number;
};

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session.ok) {
    return Response.json({ error: session.error }, { status: session.status });
  }

  const url = new URL(req.url);
  const qs = url.searchParams.toString();
  const path = qs ? `/admin/ops/logs?${qs}` : "/admin/ops/logs";

  const result = await authApiFetch<OpsLogsPayload>(path, {
    method: "GET",
    headers: { Authorization: `Bearer ${session.session.accessToken}` },
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json(result.data);
}

export async function DELETE() {
  const session = await requireAdminSession();
  if (!session.ok) {
    return Response.json({ error: session.error }, { status: session.status });
  }

  const result = await authApiFetch<{ ok?: boolean }>("/admin/ops/logs", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.session.accessToken}` },
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ ok: true });
}
