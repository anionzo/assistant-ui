"use client";

import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type AssistantRuntime,
} from "@assistant-ui/react";
import type { AudioChunk } from "@idx/voice-input";
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  ActiveThreadContextSync,
  resolveConversationId,
} from "./active-thread-context";
import { createModularRagAdapter } from "./modular-rag-adapter";
import { ModularRagDictationAdapter } from "./modular-rag-dictation-adapter";
import { ThreadListSessionSync } from "./thread-list-session-sync";
import { useRemotePersistenceAdapter } from "./thread-persistence";
import {
  RuntimeChatOptionsProvider,
  useRuntimeChatOptionsRef,
} from "./runtime-chat-options";
import { VoicePlaybackProvider, useVoicePlaybackEnqueueRef } from "./voice-playback-provider";

function createChatRuntime() {
  const fallbackConversationId = crypto.randomUUID();
  const conversationIds = new Map<string, string>();
  const activeThreadIdRef = { current: undefined as string | undefined };
  const audioChunkHandlerRef: { current: (chunk: AudioChunk) => void } = {
    current: () => {},
  };

  return {
    fallbackConversationId,
    conversationIds,
    activeThreadIdRef,
    audioChunkHandlerRef,
  };
}

function VoicePlaybackWire({
  audioChunkHandlerRef,
}: {
  audioChunkHandlerRef: { current: (chunk: AudioChunk) => void };
}) {
  const enqueueRef = useVoicePlaybackEnqueueRef();

  useEffect(() => {
    audioChunkHandlerRef.current = (chunk) => enqueueRef.current(chunk);
  }, [audioChunkHandlerRef, enqueueRef]);

  return null;
}

function useDictationAdapter({
  fallbackConversationId,
  conversationIds,
  activeThreadIdRef,
  audioChunkHandlerRef,
}: ReturnType<typeof createChatRuntime>) {
  return useMemo(
    () =>
      new ModularRagDictationAdapter({
        getConversationId: () =>
          resolveConversationId(
            activeThreadIdRef,
            fallbackConversationId,
            conversationIds,
          ),
        onAudioChunk: (chunk) => audioChunkHandlerRef.current(chunk),
      }),
    [
      activeThreadIdRef,
      audioChunkHandlerRef,
      conversationIds,
      fallbackConversationId,
    ],
  );
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
  const { fallbackConversationId, conversationIds, activeThreadIdRef, audioChunkHandlerRef } =
    runtimeContext;

  const setConversationId = useCallback((threadId: string, conversationId: string) => {
    conversationIds.set(threadId, conversationId);
  }, [conversationIds]);

  const getConversationId = useCallback(
    (threadId: string) => conversationIds.get(threadId),
    [conversationIds],
  );

  const getRuntimeOptions = useRuntimeChatOptionsRef();
  const chatAdapter = useMemo(
    () => createModularRagAdapter(fallbackConversationId, getConversationId, getRuntimeOptions),
    [fallbackConversationId, getConversationId, getRuntimeOptions],
  );

  const dictationAdapter = useDictationAdapter(runtimeContext);
  const threadAdapter = useRemotePersistenceAdapter(setConversationId);

  const chatAdapterRef = useRef(chatAdapter);
  chatAdapterRef.current = chatAdapter;
  const dictationAdapterRef = useRef(dictationAdapter);
  dictationAdapterRef.current = dictationAdapter;

  const runtimeHook = useCallback(function useThreadRuntime(): AssistantRuntime {
    return useLocalRuntime(chatAdapterRef.current, {
      adapters: { dictation: dictationAdapterRef.current },
    });
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
        <VoicePlaybackWire audioChunkHandlerRef={audioChunkHandlerRef} />
        <ActiveThreadContextSync activeThreadIdRef={activeThreadIdRef} />
        <ThreadListSessionSync initialAuth={initialAuth} />
        {children}
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