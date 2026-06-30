import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import type {
  AuthStore,
  CreateChatThreadInput,
  CreateOAuthAccountInput,
  CreateUserInput,
  OAuthAccountRecord,
  StoredThreadMessage,
  UpdateChatThreadInput,
} from "../src/db/store";
import type { ChatThreadRecord, UserRecord } from "../src/db/schema";

class MemoryAuthStore implements AuthStore {
  private users = new Map<string, UserRecord>();
  private oauthAccounts = new Map<string, OAuthAccountRecord>();
  private threads = new Map<string, ChatThreadRecord>();
  private messages = new Map<string, StoredThreadMessage[]>();

  async findUserById(id: string) {
    return this.users.get(id) ?? null;
  }

  async findUserByEmail(email: string) {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async createUser(input: CreateUserInput) {
    const user: UserRecord = {
      id: crypto.randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash ?? null,
      displayName: input.displayName ?? null,
      avatarUrl: input.avatarUrl ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async findOAuthAccount(provider: string, providerAccountId: string) {
    return this.oauthAccounts.get(`${provider}:${providerAccountId}`) ?? null;
  }

  async createOAuthAccount(input: CreateOAuthAccountInput) {
    this.oauthAccounts.set(`${input.provider}:${input.providerAccountId}`, {
      id: crypto.randomUUID(),
      userId: input.userId,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      createdAt: new Date(),
    });
  }

  async listThreads(userId: string, tenantId?: string) {
    return [...this.threads.values()]
      .filter((thread) => thread.userId === userId && (!tenantId || thread.tenantId === tenantId))
      .sort((a, b) => b.updatedAt.valueOf() - a.updatedAt.valueOf());
  }

  async findThreadById(userId: string, threadId: string) {
    const thread = this.threads.get(threadId);
    return thread && thread.userId === userId ? thread : null;
  }

  async createThread(input: CreateChatThreadInput) {
    const thread: ChatThreadRecord = {
      id: crypto.randomUUID(),
      userId: input.userId,
      tenantId: input.tenantId,
      title: input.title,
      conversationId: input.conversationId,
      headMessageId: null,
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.threads.set(thread.id, thread);
    this.messages.set(thread.id, []);
    return thread;
  }

  async updateThread(userId: string, threadId: string, input: UpdateChatThreadInput) {
    const thread = await this.findThreadById(userId, threadId);
    if (!thread) return null;
    const updated: ChatThreadRecord = {
      ...thread,
      title: input.title ?? thread.title,
      archivedAt:
        input.archived === undefined
          ? thread.archivedAt
          : input.archived
            ? new Date()
            : null,
      headMessageId:
        input.headMessageId === undefined ? thread.headMessageId : input.headMessageId,
      updatedAt: new Date(),
    };
    this.threads.set(threadId, updated);
    return updated;
  }

  async deleteThread(userId: string, threadId: string) {
    const thread = await this.findThreadById(userId, threadId);
    if (!thread) return false;
    this.threads.delete(threadId);
    this.messages.delete(threadId);
    return true;
  }

  async listThreadMessages(userId: string, threadId: string) {
    const thread = await this.findThreadById(userId, threadId);
    if (!thread) return [];
    return this.messages.get(threadId) ?? [];
  }

  async replaceThreadMessages(
    userId: string,
    threadId: string,
    input: { headMessageId?: string | null; messages: StoredThreadMessage[] },
  ) {
    const thread = await this.findThreadById(userId, threadId);
    if (!thread) return 0;
    this.messages.set(threadId, input.messages);
    this.threads.set(threadId, {
      ...thread,
      headMessageId: input.headMessageId ?? null,
      updatedAt: new Date(),
    });
    return input.messages.length;
  }
}

describe("auth routes", () => {
  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", "test-secret");
    vi.stubEnv("JWT_ACCESS_TTL", "3600");
  });

  it("supports register -> login -> me", async () => {
    const app = createApp(new MemoryAuthStore());

    const registerResponse = await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "user@example.com",
        password: "Secret123!",
        displayName: "Idx User",
      }),
    });

    expect(registerResponse.status).toBe(201);
    const registerPayload = await registerResponse.json();
    expect(registerPayload.user).toMatchObject({
      email: "user@example.com",
      displayName: "Idx User",
    });
    expect(registerPayload.accessToken).toEqual(expect.any(String));

    const loginResponse = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "user@example.com",
        password: "Secret123!",
      }),
    });

    expect(loginResponse.status).toBe(200);
    const loginPayload = await loginResponse.json();
    expect(loginPayload.accessToken).toEqual(expect.any(String));

    const meResponse = await app.request("/auth/me", {
      headers: {
        authorization: `Bearer ${loginPayload.accessToken}`,
      },
    });

    expect(meResponse.status).toBe(200);
    await expect(meResponse.json()).resolves.toMatchObject({
      user: {
        email: "user@example.com",
        displayName: "Idx User",
      },
    });
  });

  it("supports thread CRUD and isolates messages by bearer user", async () => {
    const store = new MemoryAuthStore();
    const app = createApp(store);

    const ownerSession = await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "thread-owner@example.com",
        password: "Secret123!",
        displayName: "Thread Owner",
      }),
    });
    const ownerPayload = await ownerSession.json();
    const ownerAccessToken = ownerPayload.accessToken as string;
    const ownerUserId = ownerPayload.user.id as string;

    const otherSession = await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "other-user@example.com",
        password: "Secret123!",
        displayName: "Other User",
      }),
    });
    const otherAccessToken = (await otherSession.json()).accessToken as string;

    const createResponse = await app.request("/threads", {
      method: "POST",
      headers: {
        authorization: `Bearer ${ownerAccessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tenantId: "tenant-a",
      }),
    });

    expect(createResponse.status).toBe(201);
    const createPayload = await createResponse.json();
    expect(createPayload.thread.conversationId).toContain(`${ownerUserId}:`);

    const threadId = createPayload.thread.id as string;
    const putMessages = await app.request(`/threads/${threadId}/messages`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${ownerAccessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        headId: "msg-2",
        messages: [
          {
            id: "msg-1",
            parentId: null,
            message: {
              id: "msg-1",
              role: "user",
              createdAt: new Date().toISOString(),
              content: [{ type: "text", text: "Xin chào" }],
              attachments: [],
              metadata: { custom: {} },
            },
          },
          {
            id: "msg-2",
            parentId: "msg-1",
            message: {
              id: "msg-2",
              role: "assistant",
              createdAt: new Date().toISOString(),
              content: [{ type: "text", text: "Chào bạn" }],
              status: { type: "complete", reason: "stop" },
              metadata: {
                unstable_state: null,
                unstable_annotations: [],
                unstable_data: [],
                steps: [],
                custom: {},
              },
            },
          },
        ],
      }),
    });

    expect(putMessages.status).toBe(200);

    const getMessages = await app.request(`/threads/${threadId}/messages`, {
      headers: {
        authorization: `Bearer ${ownerAccessToken}`,
      },
    });

    expect(getMessages.status).toBe(200);
    await expect(getMessages.json()).resolves.toMatchObject({
      headId: "msg-2",
      messages: [
        {
          parentId: null,
          message: { id: "msg-1", role: "user" },
        },
        {
          parentId: "msg-1",
          message: { id: "msg-2", role: "assistant" },
        },
      ],
    });

    const forbidden = await app.request(`/threads/${threadId}`, {
      headers: {
        authorization: `Bearer ${otherAccessToken}`,
      },
    });

    expect(forbidden.status).toBe(404);
  });

  it("accepts assistant-ui repository items that only include message.id", async () => {
    const store = new MemoryAuthStore();
    const app = createApp(store);

    const session = await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "aui-shape@example.com",
        password: "Secret123!",
        displayName: "AUI Shape User",
      }),
    });
    const accessToken = (await session.json()).accessToken as string;

    const createResponse = await app.request("/threads", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ tenantId: "tenant-a" }),
    });
    const threadId = ((await createResponse.json()).thread as { id: string }).id;

    const putMessages = await app.request(`/threads/${threadId}/messages`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        headId: "msg-1",
        messages: [
          {
            parentId: null,
            message: {
              id: "msg-1",
              role: "user",
              createdAt: new Date().toISOString(),
              content: [{ type: "text", text: "Hello" }],
              attachments: [],
              metadata: { custom: {} },
            },
          },
        ],
      }),
    });

    expect(putMessages.status).toBe(200);
    await expect(putMessages.json()).resolves.toMatchObject({ ok: true, count: 1 });
  });

  it("accepts messages without an explicit parentId on the root item", async () => {
    const store = new MemoryAuthStore();
    const app = createApp(store);

    const session = await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "root-message@example.com",
        password: "Secret123!",
        displayName: "Root Message User",
      }),
    });
    const accessToken = (await session.json()).accessToken as string;

    const createResponse = await app.request("/threads", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ tenantId: "tenant-a" }),
    });
    const threadId = ((await createResponse.json()).thread as { id: string }).id;

    const putMessages = await app.request(`/threads/${threadId}/messages`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        headId: "msg-1",
        messages: [
          {
            id: "msg-1",
            message: {
              id: "msg-1",
              role: "user",
              createdAt: new Date().toISOString(),
              content: [{ type: "text", text: "Hello" }],
              attachments: [],
              metadata: { custom: {} },
            },
          },
        ],
      }),
    });

    expect(putMessages.status).toBe(200);
    await expect(putMessages.json()).resolves.toMatchObject({ ok: true, count: 1 });
  });
});
