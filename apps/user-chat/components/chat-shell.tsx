"use client";

import { ChatMainHeader } from "@/components/chat-main-header";
import { Thread } from "@/components/thread";
import { ThreadRouteGuard } from "@/components/thread-route-guard";
import { ThreadListSidebar } from "@/components/threadlist-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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
      <SidebarProvider>
        <div className="flex h-dvh w-full">
          <ThreadListSidebar />
          <SidebarInset className="min-w-0">
            <ChatMainHeader />
            <div className="min-h-0 flex-1">
              <Thread />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </RuntimeProvider>
  );
}