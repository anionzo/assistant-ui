"use client";

import { useEffect, useState } from "react";
import { DEFAULT_LOGO_URL } from "@/lib/branding-defaults";

export type BrandingSurface = {
  appName: string;
  tagline: string;
};

export type BrandingPayload = {
  logoUrl: string;
  admin: BrandingSurface;
  user: BrandingSurface;
};

const ADMIN_FALLBACK: BrandingSurface = {
  appName: "Idx Admin",
  tagline: "Operator console",
};

const USER_FALLBACK: BrandingSurface = {
  appName: "Idx Chat",
  tagline: "Trợ lý tuyển sinh HUIT",
};

function surfaceFor(payload: Partial<BrandingPayload> | null, app: "admin" | "user"): BrandingSurface {
  const fallback = app === "admin" ? ADMIN_FALLBACK : USER_FALLBACK;
  const slice = app === "admin" ? payload?.admin : payload?.user;
  return {
    appName: slice?.appName?.trim() || fallback.appName,
    tagline: slice?.tagline?.trim() || fallback.tagline,
  };
}

export function useBranding(app: "admin" | "user" = "admin") {
  const [payload, setPayload] = useState<BrandingPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/branding", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ branding?: Partial<BrandingPayload> }>;
      })
      .then((data) => {
        const branding = data?.branding;
        setPayload({
          logoUrl: branding?.logoUrl?.trim() || DEFAULT_LOGO_URL,
          admin: surfaceFor(branding ?? null, "admin"),
          user: surfaceFor(branding ?? null, "user"),
        });
      })
      .catch(() => {
        setPayload({
          logoUrl: DEFAULT_LOGO_URL,
          admin: ADMIN_FALLBACK,
          user: USER_FALLBACK,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const surface = surfaceFor(payload, app);
  return {
    branding: {
      logoUrl: payload?.logoUrl ?? DEFAULT_LOGO_URL,
      appName: surface.appName,
      tagline: surface.tagline,
    },
    payload,
    loading,
  };
}