import { NextResponse } from "next/server";
import { fetchPublicAppConfig } from "@/lib/server/public-app-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await fetchPublicAppConfig();
  return NextResponse.json({ branding: config.branding });
}