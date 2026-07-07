"use client";

import { ChatMainHeader } from "@/components/chat-main-header";
import { Thread } from "@/components/thread";
import { ThreadRouteGuard } from "@/components/thread-route-guard";
import { ThreadListSidebar } from "@/components/threadlist-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { chatPath } from "@/lib/chat-routes";
import { FormArtifactPanel } from "@/components/form-module/form-artifact-panel";
import { FORM_MODULE_ENABLED } from "@/lib/feature-flags";
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
      <ThreadRouteGuard threadId={threadId} enabled={initialAuth} />
      <SidebarProvider>
        <div className="flex h-dvh w-full">
          <ThreadListSidebar initialAuth={initialAuth} />
          <SidebarInset className="min-w-0">
            <ChatMainHeader />
            <div className="flex min-h-0 flex-1">
              <div className="min-w-0 flex-1">
                <Thread initialAuth={initialAuth} />
              </div>
              {FORM_MODULE_ENABLED && <FormArtifactPanel />}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </RuntimeProvider>
  );
}