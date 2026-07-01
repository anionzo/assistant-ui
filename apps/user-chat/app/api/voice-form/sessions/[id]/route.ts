import { NextResponse } from "next/server";
import {
  authVoiceFormSessionFetch,
  requireSessionUser,
} from "@/lib/server/voice-form-session-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSessionUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { id } = await context.params;
  const result = await authVoiceFormSessionFetch<{ session: unknown }>(
    `/voice-form/sessions/${encodeURIComponent(id)}`,
    { method: "GET" },
    session.token,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireSessionUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const result = await authVoiceFormSessionFetch<{ session: unknown }>(
    `/voice-form/sessions/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(body) },
    session.token,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireSessionUser();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { id } = await context.params;
  const result = await authVoiceFormSessionFetch<unknown>(
    `/voice-form/sessions/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    session.token,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return new Response(null, { status: 204 });
}