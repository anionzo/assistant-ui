import type { ExportedMessageRepository, ExportedMessageRepositoryItem } from "@assistant-ui/react";

type ThreadDto = {
  id: string;
  title: string;
  conversationId: string;
  tenantId: string;
  updatedAt: string;
  archived: boolean;
};

export type ThreadListResponse = {
  threads: ThreadDto[];
};

type ThreadMessagesResponse = {
  headId?: string | null;
  messages: ExportedMessageRepositoryItem[];
};

export class ThreadApiError extends Error {
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

const THREAD_LIST_TTL_MS = 5_000;

let threadListCache: { data: ThreadListResponse; expiresAt: number } | null = null;
let threadListInFlight: Promise<ThreadListResponse> | null = null;

const threadMetaInFlight = new Map<string, Promise<ThreadDto | null>>();

const messagesByRemoteId = new Map<string, ExportedMessageRepository>();
const messagesLoadInFlight = new Map<string, Promise<ExportedMessageRepository>>();

function invalidateThreadListCache() {
  threadListCache = null;
}

export async function fetchThreadList(): Promise<ThreadListResponse> {
  if (threadListCache && threadListCache.expiresAt > Date.now()) {
    return threadListCache.data;
  }

  if (threadListInFlight) return threadListInFlight;

  threadListInFlight = fetchThreadApi<ThreadListResponse>("/api/threads")
    .then((data) => {
      threadListCache = { data, expiresAt: Date.now() + THREAD_LIST_TTL_MS };
      return data;
    })
    .catch((err) => {
      // Expected for unauthenticated/guest users or transient errors.
      // Do not surface unhandled rejections; callers (e.g. list sidebar) treat empty as OK.
      if (err instanceof ThreadApiError && (err.status === 401 || err.status === 404)) {
        // silent for guest/local
      } else {
        console.warn("[thread-api] fetchThreadList failed", err);
      }
      return { threads: [] } as ThreadListResponse;
    })
    .finally(() => {
      threadListInFlight = null;
    });

  return threadListInFlight;
}

export async function fetchThreadMetadata(threadId: string): Promise<ThreadDto | null> {
  const existing = threadMetaInFlight.get(threadId);
  if (existing) return existing;

  const promise = fetchThreadApi<{ thread: ThreadDto }>(`/api/threads/${threadId}`)
    .then((result) => result.thread)
    .catch((err) => {
      // 401/404 common for guest or unknown/local thread id — do not spam
      if (!(err instanceof ThreadApiError && (err.status === 401 || err.status === 404))) {
        console.warn("[thread-api] fetchThreadMetadata failed", err);
      }
      return null;
    })
    .finally(() => {
      threadMetaInFlight.delete(threadId);
    });

  threadMetaInFlight.set(threadId, promise);
  return promise;
}

export async function loadThreadMessages(remoteId: string): Promise<ExportedMessageRepository> {
  const cached = messagesByRemoteId.get(remoteId);
  if (cached) return cached;

  const inFlight = messagesLoadInFlight.get(remoteId);
  if (inFlight) return inFlight;

  const promise = fetchThreadApi<ThreadMessagesResponse>(`/api/threads/${remoteId}/messages`)
    .then(reviveMessageDates)
    .catch(() => ({ messages: [] } as ExportedMessageRepository))
    .then((repository) => {
      messagesByRemoteId.set(remoteId, repository);
      return repository;
    })
    .finally(() => {
      messagesLoadInFlight.delete(remoteId);
    });

  messagesLoadInFlight.set(remoteId, promise);
  return promise;
}

export function getCachedThreadMessages(remoteId: string): ExportedMessageRepository | undefined {
  return messagesByRemoteId.get(remoteId);
}

export function updateCachedThreadMessages(
  remoteId: string,
  repository: ExportedMessageRepository,
) {
  messagesByRemoteId.set(remoteId, repository);
}

export function invalidateThreadMessages(remoteId: string) {
  messagesByRemoteId.delete(remoteId);
  messagesLoadInFlight.delete(remoteId);
}

export async function mutateThreadApi<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const result = await fetchThreadApi<T>(path, init);

  if (path === "/api/threads" && init.method === "POST") {
    invalidateThreadListCache();
  } else if (path.startsWith("/api/threads/")) {
    invalidateThreadListCache();
    const remoteId = path.split("/")[3];
    if (remoteId && init.method === "DELETE") {
      invalidateThreadMessages(remoteId);
      threadMetaInFlight.delete(remoteId);
    }
  }

  return result;
}

export async function persistThreadMessages(
  remoteId: string,
  repository: ExportedMessageRepository,
): Promise<void> {
  await mutateThreadApi(`/api/threads/${remoteId}/messages`, {
    method: "PUT",
    body: JSON.stringify({
      headId: repository.headId,
      messages: repository.messages.map((item) => ({
        parentId: item.parentId ?? null,
        message: item.message,
        ...(item.runConfig !== undefined ? { runConfig: item.runConfig } : {}),
      })),
    }),
  });
  updateCachedThreadMessages(remoteId, repository);
}

export async function unarchiveThread(remoteId: string): Promise<ThreadDto> {
  const result = await mutateThreadApi<{ thread: ThreadDto }>(`/api/threads/${remoteId}`, {
    method: "PATCH",
    body: JSON.stringify({ archived: false }),
  });
  return result.thread;
}

export async function deleteThread(remoteId: string): Promise<void> {
  await mutateThreadApi(`/api/threads/${remoteId}`, {
    method: "DELETE",
  });
}

export type { ThreadDto };