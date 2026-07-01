import { NextResponse } from "next/server";
import { P } from "@/lib/auth/permissions";
import { authApiFetch } from "@/lib/auth/auth-api-client";
import { requireAdminAnyPermission, requireAdminPermission } from "@/lib/server/require-admin-session";

export const dynamic = "force-dynamic";

type BrandingResponse = {
  branding: {
    logoUrl: string;
    admin: { appName: string; tagline: string };
    user: { appName: string; tagline: string };
    updatedAt: string | null;
  };
};

export async function GET() {
  const session = await requireAdminAnyPermission([P.SETTINGS_BRANDING_READ, P.SETTINGS_BRANDING]);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const result = await authApiFetch<BrandingResponse>("/admin/settings/branding", {
    headers: { Authorization: `Bearer ${session.session.accessToken}` },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

export async function PATCH(request: Request) {
  const session = await requireAdminPermission(P.SETTINGS_BRANDING);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = await authApiFetch<BrandingResponse>("/admin/settings/branding", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${session.session.accessToken}` },
    body: JSON.stringify(body),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}