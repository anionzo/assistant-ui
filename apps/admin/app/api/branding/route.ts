import { NextResponse } from "next/server";
import { getAdminConfig } from "@/lib/server/config";
import { DEFAULT_LOGO_URL } from "@/lib/branding-defaults";

export const dynamic = "force-dynamic";

const FALLBACK = {
  logoUrl: DEFAULT_LOGO_URL,
  admin: {
    appName: "Idx Admin",
    tagline: "Operator console",
  },
  user: {
    appName: "Idx Chat",
    tagline: "Trợ lý tuyển sinh HUIT",
  },
};

export async function GET() {
  const { idxApiUrl } = getAdminConfig();

  try {
    const response = await fetch(`${idxApiUrl}/public/branding`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      return NextResponse.json({ branding: FALLBACK });
    }

    const payload = (await response.json()) as {
      data?: { branding?: Partial<typeof FALLBACK> };
      branding?: Partial<typeof FALLBACK>;
    };

    const branding = payload.data?.branding ?? payload.branding ?? FALLBACK;
    return NextResponse.json({
      branding: {
        logoUrl: branding.logoUrl?.trim() || FALLBACK.logoUrl,
        admin: {
          appName: branding.admin?.appName?.trim() || FALLBACK.admin.appName,
          tagline: branding.admin?.tagline?.trim() || FALLBACK.admin.tagline,
        },
        user: {
          appName: branding.user?.appName?.trim() || FALLBACK.user.appName,
          tagline: branding.user?.tagline?.trim() || FALLBACK.user.tagline,
        },
      },
    });
  } catch {
    return NextResponse.json({ branding: FALLBACK });
  }
}