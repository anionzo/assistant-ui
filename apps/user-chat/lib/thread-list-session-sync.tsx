"use client";

import { useAui } from "@assistant-ui/react";
import { useEffect } from "react";

export function ThreadListSessionSync({
  initialAuth,
}: {
  initialAuth: boolean;
}) {
  const aui = useAui();

  useEffect(() => {
    if (initialAuth) return;

    let cancelled = false;

    async function syncAfterClientLogin() {
      const response = await fetch("/api/auth/me", { credentials: "include" });
      if (cancelled || !response.ok) return;

      const data = (await response.json().catch(() => null)) as {
        user?: unknown;
      } | null;
      if (!data?.user) return;

      await aui.threads().reload();
      await aui.threads().switchToNewThread();
    }

    void syncAfterClientLogin();

    return () => {
      cancelled = true;
    };
  }, [aui, initialAuth]);

  return null;
}