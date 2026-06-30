"use client";

import { chatPath } from "@/lib/chat-routes";
import { fetchThreadMetadata } from "@/lib/thread-api-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ThreadRouteGuard({ threadId }: { threadId?: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!threadId) return;

    let cancelled = false;

    void fetchThreadMetadata(threadId).then((thread) => {
      if (!cancelled && !thread) {
        router.replace(chatPath());
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router, threadId]);

  return null;
}