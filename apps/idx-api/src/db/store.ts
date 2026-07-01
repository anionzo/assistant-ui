import type { PaginatedResult } from "../utils/pagination";
import { MongoAuthStore } from "./mongo/store";
import type {
  ChatMessageRecord,
  ChatThreadRecord,
  CreateChatThreadInput,
  CreateOAuthAccountInput,
  CreateRefreshTokenInput,
  CreateUserInput,
  OAuthAccountRecord,
  PermissionRecord,
  RefreshTokenRecord,
  RoleRecord,
  StoredThreadMessage,
  UpdateChatThreadInput,
  UserRecord,
} from "./types";

export type {
  ChatMessageRecord,
  ChatThreadRecord,
  CreateChatThreadInput,
  CreateOAuthAccountInput,
  CreateRefreshTokenInput,
  CreateUserInput,
  OAuthAccountRecord,
  PermissionRecord,
  RefreshTokenRecord,
  RoleRecord,
  StoredThreadMessage,
  UpdateChatThreadInput,
  UserRecord,
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
  findUserRoles(userId: string): Promise<RoleRecord[]>;
  findUserPermissionCodes(userId: string): Promise<string[]>;
  findUserPermissionIds(userId: string): Promise<number[]>;
  ensureUserRole(userId: string, roleName: string): Promise<void>;
  revokeUserRole(userId: string, roleName: string): Promise<void>;
  getRolePermissions(roleId: number): Promise<PermissionRecord[]>;
  assignRolePermission(roleId: number, permissionId: number): Promise<void>;
  revokeRolePermission(roleId: number, permissionId: number): Promise<void>;
  listAllUsers(): Promise<UserRecord[]>;
  listUsersPage(input: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<PaginatedResult<UserRecord>>;
  countUsers(search?: string): Promise<number>;
  listThreadsPage(
    userId: string,
    tenantId: string | undefined,
    input: { page: number; limit: number },
  ): Promise<PaginatedResult<ChatThreadRecord>>;
  updateUser(userId: string, input: { displayName?: string }): Promise<UserRecord | null>;
  setUserPassword(userId: string, passwordHash: string): Promise<void>;
  setUserStatus(userId: string, status: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;
  deleteUserAccount(userId: string): Promise<boolean>;
  createResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findValidResetToken(tokenHash: string): Promise<{ id: string; userId: string } | null>;
  consumeResetToken(tokenId: string): Promise<void>;
  listRoles(): Promise<RoleRecord[]>;
  listPermissions(): Promise<PermissionRecord[]>;
}

let defaultStore: AuthStore | null = null;

export function getAuthStore(): AuthStore {
  if (!defaultStore) {
    defaultStore = new MongoAuthStore();
  }

  return defaultStore;
}