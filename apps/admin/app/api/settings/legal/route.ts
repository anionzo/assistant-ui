import { NextResponse } from "next/server";
import { P } from "@/lib/auth/permissions";
import { authApiFetch } from "@/lib/auth/auth-api-client";
import { requireAdminAnyPermission, requireAdminPermission } from "@/lib/server/require-admin-session";

export const dynamic = "force-dynamic";

type LegalResponse = {
  legal: Record<string, unknown>;
};

export async function GET() {
  const session = await requireAdminAnyPermission([P.SETTINGS_LEGAL_READ, P.SETTINGS_LEGAL]);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const result = await authApiFetch<LegalResponse>("/admin/settings/legal", {
    headers: { Authorization: `Bearer ${session.session.accessToken}` },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

export async function PATCH(request: Request) {
  const session = await requireAdminPermission(P.SETTINGS_LEGAL);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = await authApiFetch<LegalResponse>("/admin/settings/legal", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${session.session.accessToken}` },
    body: JSON.stringify(body),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}