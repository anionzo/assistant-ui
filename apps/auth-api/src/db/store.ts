import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./client";
import {
  chatMessages,
  chatThreads,
  oauthAccounts,
  refreshTokens,
  users,
  type ChatMessageRecord,
  type ChatThreadRecord,
  type UserRecord,
} from "./schema";

export type OAuthAccountRecord = {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  createdAt: Date;
};

export type CreateUserInput = {
  email: string;
  passwordHash?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

export type CreateOAuthAccountInput = {
  userId: string;
  provider: string;
  providerAccountId: string;
};

export type CreateRefreshTokenInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export type RefreshTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type CreateChatThreadInput = {
  userId: string;
  tenantId: string;
  title: string;
  conversationId: string;
};

export type UpdateChatThreadInput = {
  title?: string;
  archived?: boolean;
  headMessageId?: string | null;
};

/**
 * StoredThreadMessage stores the full serialized ThreadMessage in `content`
 * to preserve fields such as `status`, `attachments`, and `metadata` without
 * needing a dedicated column for each one. The DB `content` column therefore
 * contains the complete message object, not only the `message.content` parts.
 */
export type StoredThreadMessage = {
  id: string;
  parentId: string | null;
  role: string;
  /** The complete serialized ThreadMessage object (not just `message.content`). */
  content: Record<string, unknown>;
  runConfig?: Record<string, unknown> | undefined;
  createdAt: Date;
};

export interface AuthStore {
  findUserById(id: string): Promise<UserRecord | null>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  createUser(input: CreateUserInput): Promise<UserRecord>;
  findOAuthAccount(provider: string, providerAccountId: string): Promise<OAuthAccountRecord | null>;
  createOAuthAccount(input: CreateOAuthAccountInput): Promise<void>;
  createRefreshToken(input: CreateRefreshTokenInput): Promise<void>;
  findValidRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revokeRefreshToken(tokenHash: string): Promise<void>;
  listThreads(userId: string, tenantId?: string): Promise<ChatThreadRecord[]>;
  findThreadById(userId: string, threadId: string): Promise<ChatThreadRecord | null>;
  createThread(input: CreateChatThreadInput): Promise<ChatThreadRecord>;
  updateThread(userId: string, threadId: string, input: UpdateChatThreadInput): Promise<ChatThreadRecord | null>;
  deleteThread(userId: string, threadId: string): Promise<boolean>;
  listThreadMessages(userId: string, threadId: string): Promise<StoredThreadMessage[]>;
  replaceThreadMessages(
    userId: string,
    threadId: string,
    input: { headMessageId?: string | null; messages: StoredThreadMessage[] },
  ): Promise<number>;
}

class PostgresAuthStore implements AuthStore {
  async findUserById(id: string) {
    const db = getDb();
    return (await db.select().from(users).where(eq(users.id, id)).limit(1))[0] ?? null;
  }

  async findUserByEmail(email: string) {
    const db = getDb();
    return (await db.select().from(users).where(eq(users.email, email)).limit(1))[0] ?? null;
  }

  async createUser(input: CreateUserInput) {
    const db = getDb();
    const createdUsers = await db
      .insert(users)
      .values({
        email: input.email,
        passwordHash: input.passwordHash ?? null,
        displayName: input.displayName ?? null,
        avatarUrl: input.avatarUrl ?? null,
      })
      .returning();
    return createdUsers[0];
  }

  async findOAuthAccount(provider: string, providerAccountId: string) {
    const db = getDb();
    return (
      await db
        .select()
        .from(oauthAccounts)
        .where(
          and(
            eq(oauthAccounts.provider, provider),
            eq(oauthAccounts.providerAccountId, providerAccountId),
          ),
        )
        .limit(1)
    )[0] ?? null;
  }

  async createOAuthAccount(input: CreateOAuthAccountInput) {
    const db = getDb();
    await db.insert(oauthAccounts).values(input);
  }

  async createRefreshToken(input: CreateRefreshTokenInput) {
    const db = getDb();
    await db.insert(refreshTokens).values(input);
  }

  async findValidRefreshToken(tokenHash: string) {
    const db = getDb();
    const row =
      (
        await db
          .select()
          .from(refreshTokens)
          .where(eq(refreshTokens.tokenHash, tokenHash))
          .limit(1)
      )[0] ?? null;

    if (!row || row.revokedAt || row.expiresAt <= new Date()) return null;
    return row;
  }

  async revokeRefreshToken(tokenHash: string) {
    const db = getDb();
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, tokenHash));
  }

  async listThreads(userId: string, tenantId?: string) {
    const db = getDb();
    return db
      .select()
      .from(chatThreads)
      .where(
        tenantId
          ? and(eq(chatThreads.userId, userId), eq(chatThreads.tenantId, tenantId))
          : eq(chatThreads.userId, userId),
      )
      .orderBy(desc(chatThreads.updatedAt));
  }

  async findThreadById(userId: string, threadId: string) {
    const db = getDb();
    return (
      await db
        .select()
        .from(chatThreads)
        .where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)))
        .limit(1)
    )[0] ?? null;
  }

  async createThread(input: CreateChatThreadInput) {
    const db = getDb();
    const rows = await db
      .insert(chatThreads)
      .values(input)
      .returning();
    return rows[0];
  }

  async updateThread(userId: string, threadId: string, input: UpdateChatThreadInput) {
    const db = getDb();
    const values: Partial<typeof chatThreads.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.title !== undefined) values.title = input.title;
    if (input.archived !== undefined) values.archivedAt = input.archived ? new Date() : null;
    if (input.headMessageId !== undefined) values.headMessageId = input.headMessageId;

    const rows = await db
      .update(chatThreads)
      .set(values)
      .where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)))
      .returning();
    return rows[0] ?? null;
  }

  async deleteThread(userId: string, threadId: string) {
    const db = getDb();
    const rows = await db
      .delete(chatThreads)
      .where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)))
      .returning({ id: chatThreads.id });
    return rows.length > 0;
  }

  async listThreadMessages(userId: string, threadId: string) {
    const db = getDb();
    const thread = await this.findThreadById(userId, threadId);
    if (!thread) return [];

    const rows = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.threadId, thread.id))
      .orderBy(chatMessages.createdAt);

    return rows.map((row) => ({
      id: row.id,
      parentId: row.parentId,
      role: row.role,
      content: row.content as Record<string, unknown>,
      runConfig: (row.runConfig ?? undefined) as Record<string, unknown> | undefined,
      createdAt: row.createdAt,
    }));
  }

  async replaceThreadMessages(
    userId: string,
    threadId: string,
    input: { headMessageId?: string | null; messages: StoredThreadMessage[] },
  ) {
    const db = getDb();
    const thread = await this.findThreadById(userId, threadId);
    if (!thread) return 0;

    await db.transaction(async (tx) => {
      await tx.delete(chatMessages).where(eq(chatMessages.threadId, thread.id));

      if (input.messages.length > 0) {
        await tx.insert(chatMessages).values(
          input.messages.map((message) => ({
            id: message.id,
            threadId: thread.id,
            parentId: message.parentId,
            role: message.role,
            content: message.content,
            runConfig: message.runConfig ?? null,
            createdAt: message.createdAt,
          })),
        );
      }

      await tx
        .update(chatThreads)
        .set({
          headMessageId: input.headMessageId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(chatThreads.id, thread.id));
    });

    return input.messages.length;
  }
}

let defaultStore: AuthStore | null = null;

export function getAuthStore(): AuthStore {
  if (!defaultStore) {
    defaultStore = new PostgresAuthStore();
  }

  return defaultStore;
}
