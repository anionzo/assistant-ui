import { NextResponse } from "next/server";
import { authThreadFetch, requireSessionUser } from "@/lib/server/thread-api";
import { getServerConfig } from "@/lib/server/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

function checkGuest() {
  return !getServerConfig().authRequired;
}

export async function GET(_: Request, context: Params) {
  const session = await requireSessionUser();
  if (!session.ok) {
    if (checkGuest()) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { id } = await context.params;
  const result = await authThreadFetch<{ thread: unknown }>(
    `/threads/${encodeURIComponent(id)}`,
    { method: "GET" },
    session.token,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

export async function PATCH(request: Request, context: Params) {
  const session = await requireSessionUser();
  if (!session.ok) {
    if (checkGuest()) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const payload: Record<string, unknown> = {};
  if (typeof (body as Record<string, unknown>).title === "string") {
    payload.title = (body as Record<string, unknown>).title;
  }
  if (typeof (body as Record<string, unknown>).archived === "boolean") {
    payload.archived = (body as Record<string, unknown>).archived;
  }

  const { id } = await context.params;
  const result = await authThreadFetch<{ thread: unknown }>(
    `/threads/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    session.token,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

export async function DELETE(_: Request, context: Params) {
  const session = await requireSessionUser();
  if (!session.ok) {
    if (checkGuest()) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { id } = await context.params;
  const result = await authThreadFetch<{ ok: true }>(
    `/threads/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    session.token,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
