"use client";

import { Thread } from "@/components/thread";
import { ThreadRouteGuard } from "@/components/thread-route-guard";
import { ThreadSidebar } from "@/components/thread-sidebar";
import { chatPath } from "@/lib/chat-routes";
import { RuntimeProvider } from "@/lib/runtime-provider";
import { useParams, useRouter } from "next/navigation";
import { useCallback } from "react";

export function ChatShell({ initialAuth }: { initialAuth: boolean }) {
  const params = useParams();
  const router = useRouter();
  const threadId =
    typeof params?.threadId === "string" && params.threadId.length > 0
      ? params.threadId
      : undefined;

  const handleThreadIdChange = useCallback(
    (remoteId: string | undefined) => {
      const nextPath = chatPath(remoteId);
      if (window.location.pathname === nextPath) return;
      router.replace(nextPath);
    },
    [router],
  );

  return (
    <RuntimeProvider
      initialAuth={initialAuth}
      threadId={threadId}
      onThreadIdChange={handleThreadIdChange}
    >
      <ThreadRouteGuard threadId={threadId} />
      <main className="app-shell flex h-screen">
        <ThreadSidebar />
        <div className="min-w-0 flex-1">
          <Thread />
        </div>
      </main>
    </RuntimeProvider>
  );
}