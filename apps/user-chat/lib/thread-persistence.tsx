"use client";

import {
  RuntimeAdapterProvider,
  useAui,
  type ExportedMessageRepository,
  type ExportedMessageRepositoryItem,
  type RemoteThreadListAdapter,
  type ThreadHistoryAdapter,
  type ThreadMessage,
} from "@assistant-ui/react";
import { useMemo, type PropsWithChildren } from "react";

type ThreadDto = {
  id: string;
  title: string;
  conversationId: string;
  tenantId: string;
  updatedAt: string;
  archived: boolean;
};

type ThreadListResponse = {
  threads: ThreadDto[];
};

type ThreadMessagesResponse = {
  headId?: string | null;
  messages: ExportedMessageRepositoryItem[];
};

function reviveMessageDates(repository: ThreadMessagesResponse): ExportedMessageRepository {
  return {
    headId: repository.headId,
    messages: repository.messages.map((item) => ({
      ...item,
      message: {
        ...item.message,
        createdAt: new Date(item.message.createdAt),
      },
    })),
  };
}

class ThreadApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ThreadApiError";
    this.status = status;
  }
}

async function fetchThreadApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new ThreadApiError(
      typeof payload.error === "string" ? payload.error : "Thread API request failed",
      response.status,
    );
  }

  return payload as T;
}

function firstUserMessageTitle(messages: readonly ThreadMessage[]) {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser) return "Cuộc trò chuyện mới";

  const text = firstUser.content
    .filter((part): part is Extract<(typeof firstUser.content)[number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();

  return text ? text.slice(0, 40) : "Cuộc trò chuyện mới";
}

function toMetadata(thread: ThreadDto) {
  const lastMessageAt = new Date(thread.updatedAt);
  return {
    remoteId: thread.id,
    externalId: thread.conversationId,
    title: thread.title,
    status: thread.archived ? ("archived" as const) : ("regular" as const),
    lastMessageAt,
    custom: {
      conversationId: thread.conversationId,
      tenantId: thread.tenantId,
    },
  };
}

const PERSIST_DEBOUNCE_MS = 800;

class RemoteHistoryAdapter implements ThreadHistoryAdapter {
  private repository: ExportedMessageRepository = { messages: [] };
  private repositoryRemoteId: string | null = null;
  private repositoryLoaded = false;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly aui: ReturnType<typeof useAui>) {}

  /**
   * Serializes all read-modify-write operations so concurrent appends/deletes
   * do not overwrite each other. Each operation waits for the previous one.
   */
  private writeChain: Promise<void> = Promise.resolve();

  private enqueueWrite(operation: () => Promise<void>) {
    const next = this.writeChain.then(operation).catch((error) => {
      console.error("[thread-persistence] write failed", error);
    });
    this.writeChain = next;
    return next;
  }

  private async getRemoteThreadId() {
    const remoteId = this.aui.threadListItem().getState().remoteId;
    if (remoteId) return remoteId;
    return (await this.aui.threadListItem().initialize()).remoteId;
  }

  private async ensureRepositoryLoaded(remoteId: string) {
    if (this.repositoryLoaded && this.repositoryRemoteId === remoteId) return;

    try {
      this.repository = reviveMessageDates(
        await fetchThreadApi<ThreadMessagesResponse>(
          `/api/threads/${remoteId}/messages`,
        ),
      );
    } catch {
      this.repository = { messages: [] };
    }

    this.repositoryRemoteId = remoteId;
    this.repositoryLoaded = true;
  }

  private applyItem(item: ExportedMessageRepositoryItem) {
    const nextMessages = [...this.repository.messages];
    const existingIndex = nextMessages.findIndex(
      (message) => message.message.id === item.message.id,
    );

    if (existingIndex >= 0) nextMessages[existingIndex] = item;
    else nextMessages.push(item);

    this.repository = {
      headId: item.message.id,
      messages: nextMessages,
    };
  }

  private shouldFlushImmediately(item: ExportedMessageRepositoryItem) {
    return item.message.role === "assistant";
  }

  private clearPersistTimer() {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
  }

  private async flushPersist() {
    this.clearPersistTimer();
    const remoteId = await this.getRemoteThreadId();
    await fetchThreadApi(`/api/threads/${remoteId}/messages`, {
      method: "PUT",
      body: JSON.stringify({
        headId: this.repository.headId,
        messages: this.repository.messages.map((item) => ({
          parentId: item.parentId ?? null,
          message: item.message,
          ...(item.runConfig !== undefined ? { runConfig: item.runConfig } : {}),
        })),
      }),
    });
  }

  private schedulePersist(immediate: boolean) {
    this.clearPersistTimer();
    if (immediate) {
      return this.flushPersist();
    }

    return new Promise<void>((resolve, reject) => {
      this.persistTimer = setTimeout(() => {
        this.persistTimer = null;
        void this.flushPersist().then(resolve).catch(reject);
      }, PERSIST_DEBOUNCE_MS);
    });
  }

  async load(): Promise<ExportedMessageRepository> {
    const remoteId = this.aui.threadListItem().getState().remoteId;
    if (!remoteId) return { messages: [] };

    await this.ensureRepositoryLoaded(remoteId);
    return this.repository;
  }

  async append(item: ExportedMessageRepositoryItem) {
    await this.enqueueWrite(async () => {
      const remoteId = await this.getRemoteThreadId();
      await this.ensureRepositoryLoaded(remoteId);
      this.applyItem(item);
      await this.schedulePersist(this.shouldFlushImmediately(item));
    });
  }

  async delete(items: ExportedMessageRepositoryItem[]) {
    await this.enqueueWrite(async () => {
      const remoteId = await this.getRemoteThreadId();
      await this.ensureRepositoryLoaded(remoteId);

      const deletedIds = new Set(items.map((item) => item.message.id));
      const messages = this.repository.messages.filter(
        (item) => !deletedIds.has(item.message.id),
      );
      const headId =
        this.repository.headId && deletedIds.has(this.repository.headId)
          ? messages.at(-1)?.message.id ?? null
          : this.repository.headId;

      this.repository = { headId, messages };
      await this.schedulePersist(true);
    });
  }
}

function ThreadHistoryProvider({ children }: PropsWithChildren) {
  const aui = useAui();
  const history = useMemo(() => new RemoteHistoryAdapter(aui), [aui]);

  const adapters = useMemo(
    () => ({
      history,
    }),
    [history],
  );

  return (
    <RuntimeAdapterProvider adapters={adapters}>
      {children}
    </RuntimeAdapterProvider>
  );
}

export function useRemotePersistenceAdapter(
  onConversationId: (threadId: string, conversationId: string) => void,
) {
  return useMemo<RemoteThreadListAdapter>(() => ({
    async list() {
      try {
        const result = await fetchThreadApi<ThreadListResponse>("/api/threads");
        result.threads.forEach((thread) => {
          onConversationId(thread.id, thread.conversationId);
        });
        return { threads: result.threads.map(toMetadata) };
      } catch {
        return { threads: [] };
      }
    },
    async rename(remoteId, newTitle) {
      await fetchThreadApi(`/api/threads/${remoteId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: newTitle }),
      });
    },
    async archive(remoteId) {
      await fetchThreadApi(`/api/threads/${remoteId}`, {
        method: "PATCH",
        body: JSON.stringify({ archived: true }),
      });
    },
    async unarchive(remoteId) {
      await fetchThreadApi(`/api/threads/${remoteId}`, {
        method: "PATCH",
        body: JSON.stringify({ archived: false }),
      });
    },
    async delete(remoteId) {
      await fetchThreadApi(`/api/threads/${remoteId}`, {
        method: "DELETE",
      });
    },
    async initialize(threadId: string) {
      try {
        const result = await fetchThreadApi<{ thread: ThreadDto }>("/api/threads", {
          method: "POST",
          body: JSON.stringify({}),
        });
        onConversationId(result.thread.id, result.thread.conversationId);
        return {
          remoteId: result.thread.id,
          externalId: result.thread.conversationId,
        };
      } catch {
        return {
          remoteId: threadId,
          externalId: undefined,
        };
      }
    },
    async generateTitle(remoteId, messages) {
      const title = firstUserMessageTitle(messages);
      await fetchThreadApi(`/api/threads/${remoteId}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      // Title is set synchronously; return an empty AssistantStream.
      return new ReadableStream<never>({
        start(controller) {
          controller.close();
        },
      });
    },
    async fetch(threadId) {
      try {
        const result = await fetchThreadApi<{ thread: ThreadDto }>(
          `/api/threads/${threadId}`,
        );
        onConversationId(result.thread.id, result.thread.conversationId);
        return toMetadata(result.thread);
      } catch {
        return {
          remoteId: threadId,
          externalId: undefined,
          status: "regular" as const,
        };
      }
    },
    unstable_Provider: ThreadHistoryProvider,
  }), [onConversationId]);
}
