import { fetchPublicAppConfig } from "@/lib/server/public-app-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await fetchPublicAppConfig();
  return Response.json({
    branding: {
      logoUrl: config.branding.logoUrl,
      appName: config.branding.user.appName,
      tagline: config.branding.user.tagline,
    },
  });
}