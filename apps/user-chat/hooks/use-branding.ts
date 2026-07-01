"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LOGO_URL } from "@/lib/branding-defaults";

const FALLBACK = {
  logoUrl: DEFAULT_LOGO_URL,
  appName: "Idx Chat",
  tagline: "Trợ lý tuyển sinh HUIT",
};

export function useBranding() {
  const [branding, setBranding] = useState(FALLBACK);
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