"use client";

import { chatPath } from "@/lib/chat-routes";
import { fetchThreadMetadata } from "@/lib/thread-api-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function isLocalThreadId(id: string | undefined): boolean {
  if (!id) return true;
  return id.startsWith("__LOCALID") || id.startsWith("local-") || !id.includes("-"); // rough heuristic for client temp ids
}

export function ThreadRouteGuard({ threadId, enabled = true }: { threadId?: string; enabled?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!threadId || !enabled || isLocalThreadId(threadId)) return;

    let cancelled = false;

    void fetchThreadMetadata(threadId).then((thread) => {
      if (!cancelled && !thread) {
        router.replace(chatPath());
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router, threadId, enabled]);

  return null;
}