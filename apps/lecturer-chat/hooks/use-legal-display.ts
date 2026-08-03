"use client";

import { useEffect, useState } from "react";
import type { LegalDisplayConfig } from "@/lib/server/public-legal";

const DEFAULT_DISPLAY: LegalDisplayConfig = {
  footerOnPublicPages: true,
  footerOnAuthPages: true,
  showHomeFeatures: true,
  showHomeCtaRegister: true,
};

export function useLegalDisplay() {
  const [display, setDisplay] = useState<LegalDisplayConfig>(DEFAULT_DISPLAY);

  useEffect(() => {
    void fetch("/api/legal/display", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { display?: LegalDisplayConfig } | null) => {
        if (data?.display) setDisplay({ ...DEFAULT_DISPLAY, ...data.display });
      })
      .catch(() => undefined);
  }, []);

  return display;
}