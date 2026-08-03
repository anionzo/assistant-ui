"use client";

import { useEffect, useState } from "react";
import { APP_CONFIG_FALLBACKS } from "@/lib/app-config-fallbacks";

export type BrandingState = {
  logoUrl: string;
  appName: string;
  tagline: string;
};

/** Empty/neutral until /api/branding resolves — avoid flashing product-specific copy. */
const EMPTY_BRANDING: BrandingState = {
  logoUrl: APP_CONFIG_FALLBACKS.branding.logoUrl,
  appName: APP_CONFIG_FALLBACKS.branding.user.appName,
  tagline: APP_CONFIG_FALLBACKS.branding.user.tagline,
};

export function useBranding(initialBranding?: BrandingState) {
  const [branding, setBranding] = useState<BrandingState>(
    initialBranding ?? EMPTY_BRANDING,
  );
  const [loading, setLoading] = useState(!initialBranding);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/branding", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return EMPTY_BRANDING;
        const data = (await res.json()) as {
          branding?: { logoUrl?: string; appName?: string; tagline?: string };
        };
        return {
          logoUrl: data.branding?.logoUrl?.trim() || "",
          appName: data.branding?.appName?.trim() || "",
          tagline: data.branding?.tagline?.trim() || "",
        };
      })
      .then((data) => {
        if (!cancelled) setBranding(data);
      })
      .catch(() => {
        if (!cancelled) setBranding(EMPTY_BRANDING);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { branding, loading };
}
