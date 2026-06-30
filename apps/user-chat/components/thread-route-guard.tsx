"use client";

import { chatPath } from "@/lib/chat-routes";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ThreadRouteGuard({ threadId }: { threadId?: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!threadId) return;

    let cancelled = false;

    fetch(`/api/threads/${encodeURIComponent(threadId)}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((response) => {
        if (!cancelled && !response.ok) {
          router.replace(chatPath());
        }
      })
      .catch(() => {
        if (!cancelled) router.replace(chatPath());
      });

    return () => {
      cancelled = true;
    };
  }, [router, threadId]);

  return null;
}