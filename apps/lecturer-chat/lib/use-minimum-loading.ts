"use client";

import { useEffect, useState } from "react";

/**
 * Keeps loading true for at least `minMs` to avoid sub-frame skeleton/loader flashes.
 */
export function useMinimumLoading(active: boolean, minMs = 320) {
  const [visible, setVisible] = useState(active);

  useEffect(() => {
    if (active) {
      setVisible(true);
      return;
    }

    const startedAt = Date.now();
    const timer = setTimeout(() => {
      setVisible(false);
    }, Math.max(0, minMs - (Date.now() - startedAt)));

    return () => clearTimeout(timer);
  }, [active, minMs]);

  return visible;
}