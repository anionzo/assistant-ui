"use client";

import { useEffect, useState } from "react";
import { APP_CONFIG_FALLBACKS } from "@/lib/app-config-fallbacks";

type BrandingState = {
  logoUrl: string;
  appName: string;
  tagline: string;
};

const FALLBACK: BrandingState = {
  logoUrl: APP_CONFIG_FALLBACKS.branding.logoUrl,
  appName: APP_CONFIG_FALLBACKS.branding.user.appName,
  tagline: APP_CONFIG_FALLBACKS.branding.user.tagline,
};

export function useBranding() {
  const [branding, setBranding] = useState<BrandingState>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/branding", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return FALLBACK;
        const data = (await res.json()) as {
          branding?: { logoUrl?: string; appName?: string; tagline?: string };
        };
        return {
          logoUrl: data.branding?.logoUrl?.trim() || FALLBACK.logoUrl,
          appName: data.branding?.appName?.trim() || FALLBACK.appName,
          tagline: data.branding?.tagline?.trim() || FALLBACK.tagline,
        };
      })
      .then((data) => setBranding(data))
      .catch(() => setBranding(FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  return { branding, loading };
}