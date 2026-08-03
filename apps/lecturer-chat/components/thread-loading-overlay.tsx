"use client";

import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useMinimumLoading } from "@/lib/use-minimum-loading";
import { useT } from "@idx/i18n";
import { useAuiState, type AssistantState } from "@assistant-ui/react";

const isThreadHydrating = (s: AssistantState) =>
  s.thread.isLoading && s.thread.messages.length === 0;

export function ThreadLoadingOverlay() {
  const t = useT();
  const hydrating = useAuiState(isThreadHydrating);
  const visible = useMinimumLoading(hydrating, 280);

  if (!visible) return null;

  return (
    <div
      data-slot="aui_thread-loading-overlay"
      className="animate-in fade-in absolute inset-0 z-10 flex items-center justify-center duration-200"
      aria-hidden={!hydrating}
    >
      <div className="bg-background/80 absolute inset-0 backdrop-blur-[1px]" />
      <LoadingSpinner label={t("loading.loadingThread")} size="lg" />
    </div>
  );
}