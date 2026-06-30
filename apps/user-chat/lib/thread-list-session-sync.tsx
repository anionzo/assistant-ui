"use client";

import { fetchCurrentUser } from "@/lib/auth/current-user";
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
      const currentUser = await fetchCurrentUser();
      if (cancelled || !currentUser) return;

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