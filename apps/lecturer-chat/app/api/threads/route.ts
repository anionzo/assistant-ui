import { NextResponse } from "next/server";
import { authThreadFetch, requireSessionUser } from "@/lib/server/thread-api";
import { getServerConfig } from "@/lib/server/config";
import { getResolvedServerConfig } from "@/lib/server/resolved-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireSessionUser();
  if (!session.ok && !getServerConfig().authRequired) {
    return NextResponse.json({ threads: [] });
  }
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const url = new URL(request.url);
  const resolved = await getResolvedServerConfig();
  const tenantId = url.searchParams.get("tenantId") ?? resolved.tenantId;
  const page = url.searchParams.get("page") ?? "1";
  const limit = url.searchParams.get("limit") ?? "50";
  const upstream = new URLSearchParams({
    tenantId,
    page,
    limit,
  });
  const result = await authThreadFetch<{ threads: unknown[]; pagination?: unknown }>(
    `/threads?${upstream.toString()}`,
    { method: "GET" },
    session.token,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

export async function POST(request: Request) {
  const session = await requireSessionUser();
  if (!session.ok) {
    if (!getServerConfig().authRequired) {
      return NextResponse.json({ error: "Login required to create threads" }, { status: 401 });
    }
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const resolved = await getResolvedServerConfig();
  const payload = {
    tenantId:
      typeof (body as Record<string, unknown>).tenantId === "string"
        ? (body as Record<string, unknown>).tenantId
        : resolved.tenantId,
    title:
      typeof (body as Record<string, unknown>).title === "string"
        ? (body as Record<string, unknown>).title
        : undefined,
    conversationId:
      typeof (body as Record<string, unknown>).conversationId === "string"
        ? (body as Record<string, unknown>).conversationId
        : undefined,
  };

  const result = await authThreadFetch<{ thread: unknown }>(
    "/threads",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    session.token,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: 201 });
}
