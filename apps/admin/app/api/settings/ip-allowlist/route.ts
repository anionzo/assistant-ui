import { NextResponse } from "next/server";
import { authApiFetch } from "@/lib/auth/auth-api-client";
import { P } from "@/lib/auth/permissions";
import { requireAdminPermission } from "@/lib/server/require-admin-session";
import { invalidateIpAllowlistCache, resolveClientIp } from "@/lib/server/ip-allowlist";

export const dynamic = "force-dynamic";

type SettingsResponse = {
  settings: {
    enabled: boolean;
    ips: string[];
    updatedAt: string | null;
    updatedBy: string | null;
  };
};

export async function GET() {
  const session = await requireAdminPermission(P.SECURITY_IP_ALLOWLIST);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const result = await authApiFetch<SettingsResponse>("/admin/settings/ip-allowlist", {
    headers: { Authorization: `Bearer ${session.session.accessToken}` },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

export async function PATCH(request: Request) {
  const session = await requireAdminPermission(P.SECURITY_IP_ALLOWLIST);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const clientIp = resolveClientIp(request.headers);
  const result = await authApiFetch<SettingsResponse>("/admin/settings/ip-allowlist", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${session.session.accessToken}`,
      "X-Client-Ip": clientIp,
    },
    body: JSON.stringify({ ...body, clientIp }),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  invalidateIpAllowlistCache();
  return NextResponse.json(result.data);
}