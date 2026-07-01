import { getServerConfig } from "@/lib/server/config";
import { DEFAULT_LOGO_URL } from "@/lib/branding-defaults";

export const dynamic = "force-dynamic";

const FALLBACK = {
  logoUrl: DEFAULT_LOGO_URL,
  appName: "Idx Chat",
  tagline: "Trợ lý tuyển sinh HUIT",
};

export async function GET() {
  const { idxApiUrl } = getServerConfig();

  try {
    const response = await fetch(`${idxApiUrl}/public/branding`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      return Response.json({ branding: FALLBACK });
    }

    const payload = (await response.json()) as {
      data?: {
        branding?: {
          logoUrl?: string;
          user?: { appName?: string; tagline?: string };
        };
      };
      branding?: {
        logoUrl?: string;
        user?: { appName?: string; tagline?: string };
      };
    };

    const branding = payload.data?.branding ?? payload.branding;
    return Response.json({
      branding: {
        logoUrl: branding?.logoUrl?.trim() || FALLBACK.logoUrl,
        appName: branding?.user?.appName?.trim() || FALLBACK.appName,
        tagline: branding?.user?.tagline?.trim() || FALLBACK.tagline,
      },
    });
  } catch {
    return Response.json({ branding: FALLBACK });
  }
}