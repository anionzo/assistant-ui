"use client";

import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type AssistantRuntime,
} from "@assistant-ui/react";
import { useCallback, useMemo, useRef, type ReactNode } from "react";
import { ActiveConversationProvider } from "./active-conversation-context";
import {
  ActiveThreadContextSync,
  resolveConversationId,
} from "./active-thread-context";
import { createModularRagAdapter } from "./modular-rag-adapter";
import { ThreadListSessionSync } from "./thread-list-session-sync";
import { useRemotePersistenceAdapter } from "./thread-persistence";
import {
  RuntimeChatOptionsProvider,
  useRuntimeChatOptionsRef,
} from "./runtime-chat-options";
import { VoicePlaybackProvider } from "./voice-playback-provider";

function createChatRuntime() {
  const fallbackConversationId = crypto.randomUUID();
  const conversationIds = new Map<string, string>();
  const activeThreadIdRef = { current: undefined as string | undefined };

  return {
    fallbackConversationId,
    conversationIds,
    activeThreadIdRef,
  };
}

function ChatRuntime({
  initialAuth,
  threadId,
  onThreadIdChange,
  children,
}: Readonly<{
  initialAuth: boolean;
  threadId?: string;
  onThreadIdChange?: (threadId: string | undefined) => void;
  children: ReactNode;
}>) {
  const runtimeContext = useRef(createChatRuntime()).current;
  const { fallbackConversationId, conversationIds, activeThreadIdRef } = runtimeContext;

  const setConversationId = useCallback((threadId: string, conversationId: string) => {
    conversationIds.set(threadId, conversationId);
  }, [conversationIds]);

  const getConversationId = useCallback(
    (threadId: string) => conversationIds.get(threadId),
    [conversationIds],
  );

  const getActiveConversationId = useCallback(
    () =>
      resolveConversationId(
        activeThreadIdRef,
        fallbackConversationId,
        conversationIds,
      ),
    [activeThreadIdRef, conversationIds, fallbackConversationId],
  );

  const getRuntimeOptions = useRuntimeChatOptionsRef();
  const chatAdapter = useMemo(
    () => createModularRagAdapter(fallbackConversationId, getConversationId, getRuntimeOptions),
    [fallbackConversationId, getConversationId, getRuntimeOptions],
  );

  const threadAdapter = useRemotePersistenceAdapter(setConversationId);

  const chatAdapterRef = useRef(chatAdapter);
  chatAdapterRef.current = chatAdapter;

  const runtimeHook = useCallback(function useThreadRuntime(): AssistantRuntime {
    return useLocalRuntime(chatAdapterRef.current);
  }, []);

  const runtime = useRemoteThreadListRuntime({
    runtimeHook,
    adapter: threadAdapter,
    threadId,
    onThreadIdChange,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <VoicePlaybackProvider>
        <ActiveConversationProvider getConversationId={getActiveConversationId}>
          <ActiveThreadContextSync activeThreadIdRef={activeThreadIdRef} />
          <ThreadListSessionSync initialAuth={initialAuth} />
          {children}
        </ActiveConversationProvider>
      </VoicePlaybackProvider>
    </AssistantRuntimeProvider>
  );
}

function RuntimeWithOptions({
  initialAuth,
  threadId,
  onThreadIdChange,
  children,
}: Readonly<{
  initialAuth: boolean;
  threadId?: string;
  onThreadIdChange?: (threadId: string | undefined) => void;
  children: ReactNode;
}>) {
  return (
    <RuntimeChatOptionsProvider>
      <ChatRuntime
        initialAuth={initialAuth}
        threadId={threadId}
        onThreadIdChange={onThreadIdChange}
      >
        {children}
      </ChatRuntime>
    </RuntimeChatOptionsProvider>
  );
}

export function RuntimeProvider({
  initialAuth,
  threadId,
  onThreadIdChange,
  children,
}: Readonly<{
  initialAuth: boolean;
  threadId?: string;
  onThreadIdChange?: (threadId: string | undefined) => void;
  children: ReactNode;
}>) {
  return (
    <RuntimeWithOptions
      initialAuth={initialAuth}
      threadId={threadId}
      onThreadIdChange={onThreadIdChange}
    >
      {children}
    </RuntimeWithOptions>
  );
}