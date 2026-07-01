import type { Collection, Document } from "mongodb";
import type {
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
} from "../types";
import { buildPaginationMeta, type PaginatedResult } from "../../utils/pagination";
import { COLLECTIONS } from "./collections";
import { getMongoDb } from "./client";

type UserDoc = {
  _id: string;
  email: string;
  passwordHash: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type OAuthAccountDoc = {
  _id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  createdAt: Date;
};

type RefreshTokenDoc = {
  _id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
};

type PasswordResetTokenDoc = {
  _id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

type ChatThreadDoc = {
  _id: string;
  userId: string;
  tenantId: string;
  title: string;
  conversationId: string;
  headMessageId: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  messages: StoredThreadMessage[];
};

type RoleDoc = {
  _id: number;
  name: string;
  description: string | null;
  createdAt: Date;
};

type PermissionDoc = {
  _id: number;
  code: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  createdAt: Date;
};

function toUserRecord(doc: UserDoc): UserRecord {
  return {
    id: doc._id,
    email: doc.email,
    passwordHash: doc.passwordHash,
    displayName: doc.displayName,
    avatarUrl: doc.avatarUrl,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toThreadRecord(doc: ChatThreadDoc): ChatThreadRecord {
  return {
    id: doc._id,
    userId: doc.userId,
    tenantId: doc.tenantId,
    title: doc.title,
    conversationId: doc.conversationId,
    headMessageId: doc.headMessageId,
    archivedAt: doc.archivedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toRoleRecord(doc: RoleDoc): RoleRecord {
  return {
    id: doc._id,
    name: doc.name,
    description: doc.description,
    createdAt: doc.createdAt,
  };
}

function toPermissionRecord(doc: PermissionDoc): PermissionRecord {
  return {
    id: doc._id,
    code: doc.code,
    name: doc.name,
    description: doc.description,
    resource: doc.resource,
    action: doc.action,
    createdAt: doc.createdAt,
  };
}

async function collection<T extends Document>(name: string): Promise<Collection<T>> {
  const db = await getMongoDb();
  return db.collection<T>(name);
}

export class MongoAuthStore {
  async findUserById(id: string) {
    const doc = await (await collection<UserDoc>(COLLECTIONS.users)).findOne({ _id: id });
    return doc ? toUserRecord(doc) : null;
  }

  async findUserByEmail(email: string) {
    const doc = await (await collection<UserDoc>(COLLECTIONS.users)).findOne({ email });
    return doc ? toUserRecord(doc) : null;
  }

  async createUser(input: CreateUserInput) {
    const now = new Date();
    const doc: UserDoc = {
      _id: crypto.randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash ?? null,
      displayName: input.displayName ?? null,
      avatarUrl: input.avatarUrl ?? null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    await (await collection<UserDoc>(COLLECTIONS.users)).insertOne(doc);
    return toUserRecord(doc);
  }

  async findOAuthAccount(provider: string, providerAccountId: string) {
    const doc = await (await collection<OAuthAccountDoc>(COLLECTIONS.oauthAccounts)).findOne({
      provider,
      providerAccountId,
    });
    if (!doc) return null;
    return {
      id: doc._id,
      userId: doc.userId,
      provider: doc.provider,
      providerAccountId: doc.providerAccountId,
      createdAt: doc.createdAt,
    } satisfies OAuthAccountRecord;
  }

  async createOAuthAccount(input: CreateOAuthAccountInput) {
    const doc: OAuthAccountDoc = {
      _id: crypto.randomUUID(),
      userId: input.userId,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      createdAt: new Date(),
    };
    await (await collection<OAuthAccountDoc>(COLLECTIONS.oauthAccounts)).insertOne(doc);
  }

  async createRefreshToken(input: CreateRefreshTokenInput) {
    const doc: RefreshTokenDoc = {
      _id: crypto.randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
      createdAt: new Date(),
    };
    await (await collection<RefreshTokenDoc>(COLLECTIONS.refreshTokens)).insertOne(doc);
  }

  async findValidRefreshToken(tokenHash: string) {
    const doc = await (await collection<RefreshTokenDoc>(COLLECTIONS.refreshTokens)).findOne({ tokenHash });
    if (!doc || doc.revokedAt || doc.expiresAt <= new Date()) return null;
    return {
      id: doc._id,
      userId: doc.userId,
      tokenHash: doc.tokenHash,
      expiresAt: doc.expiresAt,
      revokedAt: doc.revokedAt,
    } satisfies RefreshTokenRecord;
  }

  async revokeRefreshToken(tokenHash: string) {
    await (await collection<RefreshTokenDoc>(COLLECTIONS.refreshTokens)).updateOne(
      { tokenHash },
      { $set: { revokedAt: new Date() } },
    );
  }

  async listThreads(userId: string, tenantId?: string) {
    const page = await this.listThreadsPage(userId, tenantId, { page: 1, limit: 10_000 });
    return page.items;
  }

  async listThreadsPage(
    userId: string,
    tenantId: string | undefined,
    input: { page: number; limit: number },
  ): Promise<PaginatedResult<ChatThreadRecord>> {
    const filter = tenantId ? { userId, tenantId } : { userId };
    const coll = await collection<ChatThreadDoc>(COLLECTIONS.chatThreads);
    const skip = (input.page - 1) * input.limit;
    const [docs, total] = await Promise.all([
      coll.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(input.limit).toArray(),
      coll.countDocuments(filter),
    ]);
    const meta = buildPaginationMeta(total, input.page, input.limit);
    return { ...meta, items: docs.map(toThreadRecord) };
  }

  async findThreadById(userId: string, threadId: string) {
    const doc = await (await collection<ChatThreadDoc>(COLLECTIONS.chatThreads)).findOne({
      _id: threadId,
      userId,
    });
    return doc ? toThreadRecord(doc) : null;
  }

  async createThread(input: CreateChatThreadInput) {
    const now = new Date();
    const doc: ChatThreadDoc = {
      _id: crypto.randomUUID(),
      userId: input.userId,
      tenantId: input.tenantId,
      title: input.title,
      conversationId: input.conversationId,
      headMessageId: null,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    await (await collection<ChatThreadDoc>(COLLECTIONS.chatThreads)).insertOne(doc);
    return toThreadRecord(doc);
  }

  async updateThread(userId: string, threadId: string, input: UpdateChatThreadInput) {
    const updates: Partial<ChatThreadDoc> = { updatedAt: new Date() };
    if (input.title !== undefined) updates.title = input.title;
    if (input.archived !== undefined) updates.archivedAt = input.archived ? new Date() : null;
    if (input.headMessageId !== undefined) updates.headMessageId = input.headMessageId;

    const result = await (await collection<ChatThreadDoc>(COLLECTIONS.chatThreads)).findOneAndUpdate(
      { _id: threadId, userId },
      { $set: updates },
      { returnDocument: "after" },
    );
    return result ? toThreadRecord(result) : null;
  }

  async deleteThread(userId: string, threadId: string) {
    const result = await (await collection<ChatThreadDoc>(COLLECTIONS.chatThreads)).deleteOne({
      _id: threadId,
      userId,
    });
    return result.deletedCount > 0;
  }

  async listThreadMessages(userId: string, threadId: string) {
    const doc = await (await collection<ChatThreadDoc>(COLLECTIONS.chatThreads)).findOne({
      _id: threadId,
      userId,
    });
    if (!doc) return [];
    return doc.messages.map((message) => ({
      id: message.id,
      parentId: message.parentId,
      role: message.role,
      content: message.content,
      runConfig: message.runConfig,
      createdAt: message.createdAt,
    }));
  }

  async replaceThreadMessages(
    userId: string,
    threadId: string,
    input: { headMessageId?: string | null; messages: StoredThreadMessage[] },
  ) {
    const result = await (await collection<ChatThreadDoc>(COLLECTIONS.chatThreads)).updateOne(
      { _id: threadId, userId },
      {
        $set: {
          messages: input.messages,
          headMessageId: input.headMessageId ?? null,
          updatedAt: new Date(),
        },
      },
    );
    if (result.matchedCount === 0) return 0;
    return input.messages.length;
  }

  async findUserRoles(userId: string) {
    const userRoles = await (await collection<{ userId: string; roleId: number }>(COLLECTIONS.userRoles))
      .find({ userId })
      .toArray();
    if (userRoles.length === 0) return [];

    const roleIds = userRoles.map((row) => row.roleId);
    const roles = await (await collection<RoleDoc>(COLLECTIONS.roles))
      .find({ _id: { $in: roleIds } })
      .toArray();
    return roles.map(toRoleRecord);
  }

  async findUserPermissionCodes(userId: string) {
    const permissionIds = await this.findUserPermissionIds(userId);
    if (permissionIds.length === 0) return [];

    const permissions = await (await collection<PermissionDoc>(COLLECTIONS.permissions))
      .find({ _id: { $in: permissionIds } })
      .toArray();
    return permissions.map((permission) => permission.code);
  }

  async findUserPermissionIds(userId: string) {
    const userRoles = await (await collection<{ userId: string; roleId: number }>(COLLECTIONS.userRoles))
      .find({ userId })
      .toArray();
    if (userRoles.length === 0) return [];

    const roleIds = userRoles.map((row) => row.roleId);
    const rolePermissions = await (await collection<{ roleId: number; permissionId: number }>(COLLECTIONS.rolePermissions))
      .find({ roleId: { $in: roleIds } })
      .toArray();
    return [...new Set(rolePermissions.map((row) => row.permissionId))];
  }

  async ensureUserRole(userId: string, roleName: string) {
    const role = await (await collection<RoleDoc>(COLLECTIONS.roles)).findOne({ name: roleName });
    if (!role) return;
    await (await collection<{ userId: string; roleId: number }>(COLLECTIONS.userRoles)).updateOne(
      { userId, roleId: role._id },
      { $setOnInsert: { userId, roleId: role._id } },
      { upsert: true },
    );
  }

  async revokeUserRole(userId: string, roleName: string) {
    const role = await (await collection<RoleDoc>(COLLECTIONS.roles)).findOne({ name: roleName });
    if (!role) return;
    await (await collection<{ userId: string; roleId: number }>(COLLECTIONS.userRoles)).deleteOne({
      userId,
      roleId: role._id,
    });
  }

  async getRolePermissions(roleId: number) {
    const rolePermissions = await (await collection<{ roleId: number; permissionId: number }>(COLLECTIONS.rolePermissions))
      .find({ roleId })
      .toArray();
    if (rolePermissions.length === 0) return [];

    const permissionIds = rolePermissions.map((row) => row.permissionId);
    const permissions = await (await collection<PermissionDoc>(COLLECTIONS.permissions))
      .find({ _id: { $in: permissionIds } })
      .sort({ _id: 1 })
      .toArray();
    return permissions.map(toPermissionRecord);
  }

  async assignRolePermission(roleId: number, permissionId: number) {
    await (await collection<{ roleId: number; permissionId: number }>(COLLECTIONS.rolePermissions)).updateOne(
      { roleId, permissionId },
      { $setOnInsert: { roleId, permissionId } },
      { upsert: true },
    );
  }

  async revokeRolePermission(roleId: number, permissionId: number) {
    await (await collection<{ roleId: number; permissionId: number }>(COLLECTIONS.rolePermissions)).deleteOne({
      roleId,
      permissionId,
    });
  }

  async listAllUsers() {
    const page = await this.listUsersPage({ page: 1, limit: 10_000 });
    return page.items;
  }

  async countUsers(search?: string) {
    const filter = search
      ? { email: { $regex: escapeRegex(search), $options: "i" } }
      : {};
    return (await collection<UserDoc>(COLLECTIONS.users)).countDocuments(filter);
  }

  async listUsersPage(input: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<PaginatedResult<UserRecord>> {
    const filter = input.search
      ? { email: { $regex: escapeRegex(input.search), $options: "i" } }
      : {};
    const coll = await collection<UserDoc>(COLLECTIONS.users);
    const skip = (input.page - 1) * input.limit;
    const [docs, total] = await Promise.all([
      coll.find(filter).sort({ createdAt: 1 }).skip(skip).limit(input.limit).toArray(),
      coll.countDocuments(filter),
    ]);
    const meta = buildPaginationMeta(total, input.page, input.limit);
    return { ...meta, items: docs.map(toUserRecord) };
  }

  async updateUser(userId: string, input: { displayName?: string }) {
    const updates: Partial<UserDoc> = { updatedAt: new Date() };
    if (input.displayName !== undefined) updates.displayName = input.displayName;

    const result = await (await collection<UserDoc>(COLLECTIONS.users)).findOneAndUpdate(
      { _id: userId },
      { $set: updates },
      { returnDocument: "after" },
    );
    return result ? toUserRecord(result) : null;
  }

  async setUserPassword(userId: string, passwordHash: string) {
    await (await collection<UserDoc>(COLLECTIONS.users)).updateOne(
      { _id: userId },
      { $set: { passwordHash, updatedAt: new Date() } },
    );
  }

  async setUserStatus(userId: string, status: string) {
    await (await collection<UserDoc>(COLLECTIONS.users)).updateOne(
      { _id: userId },
      { $set: { status, updatedAt: new Date() } },
    );
  }

  async revokeAllUserTokens(userId: string) {
    await (await collection<RefreshTokenDoc>(COLLECTIONS.refreshTokens)).updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  }

  async deleteUserAccount(userId: string) {
    const db = await getMongoDb();
    await Promise.all([
      db.collection(COLLECTIONS.chatThreads).deleteMany({ userId }),
      db.collection(COLLECTIONS.oauthAccounts).deleteMany({ userId }),
      db.collection(COLLECTIONS.refreshTokens).deleteMany({ userId }),
      db.collection(COLLECTIONS.passwordResetTokens).deleteMany({ userId }),
      db.collection(COLLECTIONS.userRoles).deleteMany({ userId }),
    ]);
    const result = await (await collection<UserDoc>(COLLECTIONS.users)).deleteOne({ _id: userId });
    return result.deletedCount > 0;
  }

  async createResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    const doc: PasswordResetTokenDoc = {
      _id: crypto.randomUUID(),
      userId,
      tokenHash,
      expiresAt,
      usedAt: null,
      createdAt: new Date(),
    };
    await (await collection<PasswordResetTokenDoc>(COLLECTIONS.passwordResetTokens)).insertOne(doc);
  }

  async findValidResetToken(tokenHash: string) {
    const doc = await (await collection<PasswordResetTokenDoc>(COLLECTIONS.passwordResetTokens)).findOne({
      tokenHash,
    });
    if (!doc || doc.usedAt || doc.expiresAt <= new Date()) return null;
    return { id: doc._id, userId: doc.userId };
  }

  async consumeResetToken(tokenId: string) {
    await (await collection<PasswordResetTokenDoc>(COLLECTIONS.passwordResetTokens)).updateOne(
      { _id: tokenId },
      { $set: { usedAt: new Date() } },
    );
  }

  async listRoles() {
    const docs = await (await collection<RoleDoc>(COLLECTIONS.roles)).find().sort({ _id: 1 }).toArray();
    return docs.map(toRoleRecord);
  }

  async listPermissions() {
    const docs = await (await collection<PermissionDoc>(COLLECTIONS.permissions)).find().sort({ _id: 1 }).toArray();
    return docs.map(toPermissionRecord);
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}