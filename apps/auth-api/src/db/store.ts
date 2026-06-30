import { and, eq } from "drizzle-orm";
import { getDb } from "./client";
import { oauthAccounts, users, type UserRecord } from "./schema";

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

export interface AuthStore {
  findUserById(id: string): Promise<UserRecord | null>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  createUser(input: CreateUserInput): Promise<UserRecord>;
  findOAuthAccount(provider: string, providerAccountId: string): Promise<OAuthAccountRecord | null>;
  createOAuthAccount(input: CreateOAuthAccountInput): Promise<void>;
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
}

let defaultStore: AuthStore | null = null;

export function getAuthStore(): AuthStore {
  if (!defaultStore) {
    defaultStore = new PostgresAuthStore();
  }

  return defaultStore;
}
