import { NextResponse } from "next/server";
import {
  authVoiceFormSessionFetch,
  requireSessionUser,
} from "@/lib/server/voice-form-session-api";
import { getServerConfig } from "@/lib/server/config";
import { getResolvedServerConfig } from "@/lib/server/resolved-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireSessionUser();
  if (!session.ok && !getServerConfig().authRequired) {
    return NextResponse.json({ sessions: [] });
  }
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const url = new URL(request.url);
  const resolved = await getResolvedServerConfig();
  const tenantId = url.searchParams.get("tenantId") ?? resolved.tenantId;
  const page = url.searchParams.get("page") ?? "1";
  const limit = url.searchParams.get("limit") ?? "50";
  const threadId = url.searchParams.get("threadId");
  const upstream = new URLSearchParams({ tenantId, page, limit });
  if (threadId) upstream.set("threadId", threadId);

  const result = await authVoiceFormSessionFetch<{ sessions: unknown[]; pagination?: unknown }>(
    `/voice-form/sessions?${upstream.toString()}`,
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
    id: typeof (body as Record<string, unknown>).id === "string" ? (body as Record<string, unknown>).id : undefined,
    formCode:
      typeof (body as Record<string, unknown>).formCode === "string"
        ? (body as Record<string, unknown>).formCode
        : undefined,
    formName:
      typeof (body as Record<string, unknown>).formName === "string"
        ? (body as Record<string, unknown>).formName
        : undefined,
    threadId:
      typeof (body as Record<string, unknown>).threadId === "string"
        ? (body as Record<string, unknown>).threadId
        : undefined,
    anchorMessageId:
      typeof (body as Record<string, unknown>).anchorMessageId === "string"
        ? (body as Record<string, unknown>).anchorMessageId
        : (body as Record<string, unknown>).anchorMessageId === null
          ? null
          : undefined,
  };

  const result = await authVoiceFormSessionFetch<{ session: unknown }>(
    "/voice-form/sessions",
    { method: "POST", body: JSON.stringify(payload) },
    session.token,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: 201 });
}