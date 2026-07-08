"use client";

import { ChatMainHeader } from "@/components/chat-main-header";
import { Thread } from "@/components/thread";
import { ThreadRouteGuard } from "@/components/thread-route-guard";
import { ThreadListSidebar } from "@/components/threadlist-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ResizableSplitPane } from "@/components/ui/resizable-split-pane";
import { chatPath } from "@/lib/chat-routes";
import { FormArtifactPanel } from "@/components/form-module/form-artifact-panel";
import { useFormModuleStore } from "@/lib/form-module/form-module-store";
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
            <ChatMainArea initialAuth={initialAuth} />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </RuntimeProvider>
  );
}

function ChatMainArea({ initialAuth }: { initialAuth: boolean }) {
  // This component is a descendant of <RuntimeProvider>, which wraps with <FormModuleProvider>.
  // Therefore useFormModuleStore is safe here.
  const hasActiveForm = useFormModuleStore((s) => s.mode === "form-fill" && !!s.binding);

  return (
    <div className="flex min-h-0 w-full flex-1 overflow-hidden">
      {FORM_MODULE_ENABLED && hasActiveForm ? (
        <ResizableSplitPane
          left={<Thread initialAuth={initialAuth} />}
          right={<FormArtifactPanel className="h-full w-full" />}
          storageKey="chat-form-split-ratio"
          defaultRatio={0.55}
          maxRatio={0.75}
          handleAriaLabel="Kéo để chỉnh kích thước giữa chat và panel biểu mẫu"
        />
      ) : (
        <div className="min-w-0 flex-1">
          <Thread initialAuth={initialAuth} />
        </div>
      )}
    </div>
  );
}