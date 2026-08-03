"use client";

import { useAuiState } from "@assistant-ui/react";
import { useEffect, type MutableRefObject } from "react";

export function ActiveThreadContextSync({
  activeThreadIdRef,
}: {
  activeThreadIdRef: MutableRefObject<string | undefined>;
}) {
  const remoteId = useAuiState((s) => s.threadListItem?.remoteId);

  useEffect(() => {
    activeThreadIdRef.current = remoteId;
  }, [activeThreadIdRef, remoteId]);

  return null;
}

export function resolveConversationId(
  activeThreadIdRef: MutableRefObject<string | undefined>,
  fallbackConversationId: string,
  conversationIds: Map<string, string>,
) {
  const threadId = activeThreadIdRef.current;
  if (!threadId) return fallbackConversationId;
  return conversationIds.get(threadId) ?? threadId;
}