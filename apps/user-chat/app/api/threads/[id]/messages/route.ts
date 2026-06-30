import { NextResponse } from "next/server";
import { authThreadFetch, requireSessionUser } from "@/lib/server/thread-api";
import { getServerConfig } from "@/lib/server/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: Params) {
  const session = await requireSessionUser();
  if (!session.ok) {
    if (!getServerConfig().authRequired) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { id } = await context.params;
  const result = await authThreadFetch<{ headId?: string | null; messages: unknown[] }>(
    `/threads/${encodeURIComponent(id)}/messages`,
    { method: "GET" },
    session.token,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

export async function PUT(request: Request, context: Params) {
  const session = await requireSessionUser();
  if (!session.ok) {
    if (!getServerConfig().authRequired) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const { id } = await context.params;
  const result = await authThreadFetch<{ ok: true; count: number }>(
    `/threads/${encodeURIComponent(id)}/messages`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
    session.token,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
