import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import type {
  AuthStore,
  CreateChatThreadInput,
  CreateOAuthAccountInput,
  CreateRefreshTokenInput,
  CreateUserInput,
  OAuthAccountRecord,
  RefreshTokenRecord,
  StoredThreadMessage,
  UpdateChatThreadInput,
} from "../src/db/store";
import type {
  ChatThreadRecord,
  PermissionRecord,
  RoleRecord,
  UserRecord,
} from "../src/db/schema";

class FullMemoryStore implements AuthStore {
  users = new Map<string, UserRecord>();
  oauthAccounts = new Map<string, OAuthAccountRecord>();
  refreshTokenRecords = new Map<string, RefreshTokenRecord>();
  passwordResetTokens = new Map<
    string,
    { id: string; userId: string; tokenHash: string; usedAt: Date | null; expiresAt: Date }
  >();
  threads = new Map<string, ChatThreadRecord>();
  messages = new Map<string, StoredThreadMessage[]>();

  userRolesMap = new Map<string, Set<number>>();
  roleStore = new Map<number, RoleRecord>();
  permStore = new Map<number, PermissionRecord>();
  rolePermMap = new Map<number, Set<number>>();

  // ── User ─────────────────────────────────────────────

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
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async listAllUsers() {
    return [...this.users.values()];
  }

  async updateUser(userId: string, input: { displayName?: string }) {
    const user = this.users.get(userId);
    if (!user) return null;
    const updated = {
      ...user,
      displayName: input.displayName ?? user.displayName,
      updatedAt: new Date(),
    };
    this.users.set(userId, updated);
    return updated;
  }

  async setUserPassword(userId: string, passwordHash: string) {
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, { ...user, passwordHash, updatedAt: new Date() });
    }
  }

  async setUserStatus(userId: string, status: string) {
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, { ...user, status, updatedAt: new Date() });
    }
  }

  async revokeAllUserTokens(userId: string) {
    for (const [hash, record] of this.refreshTokenRecords) {
      if (record.userId === userId && !record.revokedAt) {
        this.refreshTokenRecords.set(hash, { ...record, revokedAt: new Date() });
      }
    }
  }

  async deleteUserAccount(userId: string) {
    return this.users.delete(userId);
  }

  // ── OAuth ────────────────────────────────────────────

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

  // ── Refresh tokens ───────────────────────────────────

  async createRefreshToken(input: CreateRefreshTokenInput) {
    this.refreshTokenRecords.set(input.tokenHash, {
      id: crypto.randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      revokedAt: null,
    });
  }

  async findValidRefreshToken(tokenHash: string) {
    const record = this.refreshTokenRecords.get(tokenHash);
    if (!record || record.revokedAt || record.expiresAt <= new Date()) return null;
    return record;
  }

  async revokeRefreshToken(tokenHash: string) {
    const record = this.refreshTokenRecords.get(tokenHash);
    if (!record) return;
    this.refreshTokenRecords.set(tokenHash, { ...record, revokedAt: new Date() });
  }

  // ── Password reset ───────────────────────────────────

  async createResetToken(userId: string, tokenHash: string, expiresAt: Date) {
    const id = crypto.randomUUID();
    this.passwordResetTokens.set(tokenHash, {
      id,
      userId,
      tokenHash,
      usedAt: null,
      expiresAt,
    });
  }

  async findValidResetToken(tokenHash: string) {
    const record = this.passwordResetTokens.get(tokenHash);
    if (!record || record.usedAt || record.expiresAt <= new Date()) return null;
    return { id: record.id, userId: record.userId };
  }

  async consumeResetToken(tokenId: string) {
    for (const [hash, record] of this.passwordResetTokens) {
      if (record.id === tokenId) {
        this.passwordResetTokens.set(hash, { ...record, usedAt: new Date() });
        return;
      }
    }
  }

  // ── Threads ──────────────────────────────────────────

  async listThreads(userId: string, tenantId?: string) {
    return [...this.threads.values()]
      .filter(
        (t) => t.userId === userId && (!tenantId || t.tenantId === tenantId),
      )
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

  // ── RBAC ─────────────────────────────────────────────

  async findUserRoles(userId: string) {
    const roleIds = this.userRolesMap.get(userId);
    if (!roleIds) return [];
    return [...roleIds]
      .map((id) => this.roleStore.get(id))
      .filter((r): r is RoleRecord => !!r);
  }

  async findUserPermissionCodes(userId: string) {
    const roleIds = this.userRolesMap.get(userId);
    if (!roleIds) return [];
    const codes = new Set<string>();
    for (const roleId of roleIds) {
      for (const permId of this.rolePermMap.get(roleId) ?? []) {
        const perm = this.permStore.get(permId);
        if (perm) codes.add(perm.code);
      }
    }
    return [...codes];
  }

  async findUserPermissionIds(userId: string) {
    const roleIds = this.userRolesMap.get(userId);
    if (!roleIds) return [];
    const ids = new Set<number>();
    for (const roleId of roleIds) {
      for (const permId of this.rolePermMap.get(roleId) ?? []) {
        ids.add(permId);
      }
    }
    return [...ids];
  }

  async ensureUserRole(userId: string, roleName: string) {
    const role = [...this.roleStore.values()].find((r) => r.name === roleName);
    if (!role) return;
    const set = this.userRolesMap.get(userId) ?? new Set();
    set.add(role.id);
    this.userRolesMap.set(userId, set);
  }

  async revokeUserRole(userId: string, roleName: string) {
    const role = [...this.roleStore.values()].find((r) => r.name === roleName);
    if (!role) return;
    const set = this.userRolesMap.get(userId);
    if (set) {
      set.delete(role.id);
      if (set.size === 0) this.userRolesMap.delete(userId);
    }
  }

  async listRoles() {
    return [...this.roleStore.values()];
  }

  async listPermissions() {
    return [...this.permStore.values()];
  }

  async getRolePermissions(roleId: number) {
    const permIds = this.rolePermMap.get(roleId);
    if (!permIds) return [];
    return [...permIds]
      .map((id) => this.permStore.get(id))
      .filter((p): p is PermissionRecord => !!p);
  }

  async assignRolePermission(roleId: number, permissionId: number) {
    const set = this.rolePermMap.get(roleId) ?? new Set();
    set.add(permissionId);
    this.rolePermMap.set(roleId, set);
  }

  async revokeRolePermission(roleId: number, permissionId: number) {
    const set = this.rolePermMap.get(roleId);
    if (set) set.delete(permissionId);
  }
}

function seedAdminUser(store: FullMemoryStore, user: UserRecord) {
  const role = { id: 1, name: "admin", description: null, createdAt: new Date() };
  store.roleStore.set(1, role);
  store.userRolesMap.set(user.id, new Set([1]));

  // Seed all permissions
  const perms = [
    { id: 1, code: "users.list", name: "List users", resource: "users", action: "list", description: null, createdAt: new Date() },
    { id: 2, code: "users.read", name: "Read users", resource: "users", action: "read", description: null, createdAt: new Date() },
    { id: 3, code: "users.update", name: "Update users", resource: "users", action: "update", description: null, createdAt: new Date() },
    { id: 4, code: "users.assign_roles", name: "Assign roles", resource: "users", action: "assign_roles", description: null, createdAt: new Date() },
    { id: 5, code: "users.ban", name: "Ban users", resource: "users", action: "ban", description: null, createdAt: new Date() },
    { id: 6, code: "users.reset_password", name: "Reset passwords", resource: "users", action: "reset_password", description: null, createdAt: new Date() },
    { id: 7, code: "users.force_logout", name: "Force logout", resource: "users", action: "force_logout", description: null, createdAt: new Date() },
    { id: 8, code: "users.delete", name: "Delete users", resource: "users", action: "delete", description: null, createdAt: new Date() },
  ];
  for (const p of perms) {
    store.permStore.set(p.id, p);
    store.rolePermMap.set(1, (store.rolePermMap.get(1) ?? new Set()).add(p.id));
  }
}

function expectSuccess(payload: unknown) {
  expect(payload).toMatchObject({ success: true, requestId: expect.any(String) });
}

function expectApiError(payload: unknown, status: number, code: string) {
  expect(payload).toMatchObject({
    success: false,
    requestId: expect.any(String),
    error: { code, message: expect.any(String) },
  });
}

describe("response format", () => {
  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", "test-secret");
    vi.stubEnv("JWT_ACCESS_TTL", "3600");
    vi.stubEnv("JWT_REFRESH_TTL", "604800");
    vi.stubEnv("NODE_ENV", "development");
  });

  // ── Health ─────────────────────────────────────────

  describe("GET /health", () => {
    it("returns standardized envelope", async () => {
      const app = createApp(new FullMemoryStore());
      const res = await app.request("/health");
      expect(res.status).toBe(200);
      expect(res.headers.get("x-request-id")).toEqual(expect.any(String));
      const body = await res.json();
      expectSuccess(body);
      expect(body.data).toEqual({ status: "ok" });
    });
  });

  // ── Auth ───────────────────────────────────────────

  describe("POST /auth/register", () => {
    it("returns 201 with session data", async () => {
      const app = createApp(new FullMemoryStore());
      const res = await app.request("/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "a@b.com", password: "Secret123!", displayName: "User" }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expectSuccess(body);
      expect(body.data.accessToken).toEqual(expect.any(String));
      expect(body.data.refreshToken).toEqual(expect.any(String));
      expect(body.data.user.email).toBe("a@b.com");
      expect(body.data.user.displayName).toBe("User");
      expect(body.data.expiresIn).toBe(3600);
      expect(Array.isArray(body.data.roles)).toBe(true);
      expect(Array.isArray(body.data.permissions)).toBe(true);
      expect(Array.isArray(body.data.permission_ids)).toBe(true);
    });

    it("returns 409 for duplicate email", async () => {
      const app = createApp(new FullMemoryStore());
      await app.request("/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "dup@b.com", password: "Secret123!" }),
      });
      const res = await app.request("/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "dup@b.com", password: "Secret123!" }),
      });
      expect(res.status).toBe(409);
      expectApiError(await res.json(), 409, "CONFLICT");
    });

    it("returns 400 for missing email/password", async () => {
      const app = createApp(new FullMemoryStore());
      const res = await app.request("/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      expectApiError(await res.json(), 400, "VALIDATION_ERROR");
    });
  });

  describe("POST /auth/login", () => {
    async function seedLoginUser(store: FullMemoryStore) {
      await store.createUser({
        email: "login@b.com",
        passwordHash: await import("../src/services/password").then((m) => m.hashPassword("Secret123!")),
      });
    }

    it("returns 200 with session", async () => {
      const store = new FullMemoryStore();
      await seedLoginUser(store);
      const app = createApp(store);
      const res = await app.request("/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "login@b.com", password: "Secret123!" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expectSuccess(body);
      expect(body.data.accessToken).toEqual(expect.any(String));
    });

    it("returns 401 for wrong password", async () => {
      const store = new FullMemoryStore();
      await seedLoginUser(store);
      const app = createApp(store);
      const res = await app.request("/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "login@b.com", password: "WrongPass1!" }),
      });
      expect(res.status).toBe(401);
      expectApiError(await res.json(), 401, "UNAUTHORIZED");
    });

    it("returns 401 for non-existent email", async () => {
      const app = createApp(new FullMemoryStore());
      const res = await app.request("/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "noone@b.com", password: "Secret123!" }),
      });
      expect(res.status).toBe(401);
      expectApiError(await res.json(), 401, "UNAUTHORIZED");
    });
  });

  describe("GET /auth/me", () => {
    async function loginAndGetToken(store: FullMemoryStore): Promise<string> {
      await store.createUser({
        email: "me@b.com",
        passwordHash: await import("../src/services/password").then((m) => m.hashPassword("Secret123!")),
      });
      const app = createApp(store);
      const res = await app.request("/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "me@b.com", password: "Secret123!" }),
      });
      return (await res.json()).data.accessToken;
    }

    it("returns user profile", async () => {
      const store = new FullMemoryStore();
      const token = await loginAndGetToken(store);
      const app = createApp(store);
      const res = await app.request("/auth/me", {
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expectSuccess(body);
      expect(body.data.user.email).toBe("me@b.com");
      expect(Array.isArray(body.data.roles)).toBe(true);
      expect(Array.isArray(body.data.permissions)).toBe(true);
    });

    it("returns 401 without token", async () => {
      const app = createApp(new FullMemoryStore());
      const res = await app.request("/auth/me");
      expect(res.status).toBe(401);
      expectApiError(await res.json(), 401, "UNAUTHORIZED");
    });

    it("returns 401 with invalid token", async () => {
      const app = createApp(new FullMemoryStore());
      const res = await app.request("/auth/me", {
        headers: { authorization: "Bearer invalid-token" },
      });
      expect(res.status).toBe(401);
      expectApiError(await res.json(), 401, "INVALID_TOKEN");
    });
  });

  describe("POST /auth/refresh", () => {
    it("returns new tokens", async () => {
      const store = new FullMemoryStore();
      const user = await store.createUser({ email: "ref@b.com" });
      const { generateRefreshToken, hashRefreshToken, refreshTokenExpiresAt } = await import("../src/services/refresh-token");
      const rawToken = generateRefreshToken();
      await store.createRefreshToken({
        userId: user.id,
        tokenHash: hashRefreshToken(rawToken),
        expiresAt: refreshTokenExpiresAt(),
      });
      const app = createApp(store);
      const res = await app.request("/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken: rawToken }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expectSuccess(body);
      expect(body.data.accessToken).toEqual(expect.any(String));
      expect(body.data.refreshToken).toEqual(expect.any(String));
    });

    it("returns 401 for invalid token", async () => {
      const app = createApp(new FullMemoryStore());
      const res = await app.request("/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken: "bogus" }),
      });
      expect(res.status).toBe(401);
      expectApiError(await res.json(), 401, "INVALID_TOKEN");
    });
  });

  describe("POST /auth/logout", () => {
    it("returns 200 (no-op without token)", async () => {
      const app = createApp(new FullMemoryStore());
      const res = await app.request("/auth/logout", { method: "POST" });
      expect(res.status).toBe(200);
      const body = await res.json();
      expectSuccess(body);
      expect(body.requestId).toEqual(expect.any(String));
    });
  });

  describe("POST /auth/forgot-password", () => {
    it("returns token in dev mode", async () => {
      const store = new FullMemoryStore();
      await store.createUser({ email: "forgot@b.com", passwordHash: "hash" });
      const app = createApp(store);
      const res = await app.request("/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "forgot@b.com" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expectSuccess(body);
      expect(typeof body.data.token).toBe("string");
    });

    it("returns 200 even for unknown email (no enumeration)", async () => {
      const app = createApp(new FullMemoryStore());
      const res = await app.request("/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "unknown@b.com" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expectSuccess(body);
      expect(body.data).toBeUndefined();
    });
  });

  describe("POST /auth/reset-password", () => {
    it("resets password with valid token", async () => {
      const store = new FullMemoryStore();
      const user = await store.createUser({ email: "reset@b.com", passwordHash: "old-hash" });
      const { generateResetToken, hashResetToken, resetTokenExpiresAt } = await import("../src/services/reset-password");
      const rawToken = generateResetToken();
      await store.createResetToken(user.id, hashResetToken(rawToken), resetTokenExpiresAt());
      const app = createApp(store);
      const res = await app.request("/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: rawToken, password: "NewPass123!" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expectSuccess(body);
    });

    it("returns 400 for invalid token", async () => {
      const app = createApp(new FullMemoryStore());
      const res = await app.request("/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "bogus", password: "NewPass123!" }),
      });
      expect(res.status).toBe(400);
      expectApiError(await res.json(), 400, "VALIDATION_ERROR");
    });
  });

  describe("PATCH /auth/profile", () => {
    it("updates display name", async () => {
      const store = new FullMemoryStore();
      const user = await store.createUser({ email: "prof@b.com", passwordHash: "hash" });
      const { signSessionToken } = await import("../src/services/jwt");
      const token = await signSessionToken({ id: user.id, email: user.email, displayName: null, avatarUrl: null, roleIds: [] });
      const app = createApp(store);
      const res = await app.request("/auth/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName: "NewName" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expectSuccess(body);
      expect(body.data.user.displayName).toBe("NewName");
    });
  });

  describe("POST /auth/change-password", () => {
    it("changes password with correct old password", async () => {
      const store = new FullMemoryStore();
      const { hashPassword } = await import("../src/services/password");
      const user = await store.createUser({ email: "cp@b.com", passwordHash: await hashPassword("OldPass123!") });
      const { signSessionToken } = await import("../src/services/jwt");
      const token = await signSessionToken({ id: user.id, email: user.email, displayName: null, avatarUrl: null, roleIds: [] });
      const app = createApp(store);
      const res = await app.request("/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword: "OldPass123!", newPassword: "NewPass123!" }),
      });
      expect(res.status).toBe(200);
      expectSuccess(await res.json());
    });

    it("returns 403 for wrong old password", async () => {
      const store = new FullMemoryStore();
      const { hashPassword } = await import("../src/services/password");
      const user = await store.createUser({ email: "cp2@b.com", passwordHash: await hashPassword("RealPass1!") });
      const { signSessionToken } = await import("../src/services/jwt");
      const token = await signSessionToken({ id: user.id, email: user.email, displayName: null, avatarUrl: null, roleIds: [] });
      const app = createApp(store);
      const res = await app.request("/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword: "WrongPass1!", newPassword: "NewPass123!" }),
      });
      expect(res.status).toBe(403);
      expectApiError(await res.json(), 403, "FORBIDDEN");
    });
  });

  describe("DELETE /auth/account", () => {
    it("deletes own account", async () => {
      const store = new FullMemoryStore();
      const user = await store.createUser({ email: "del@b.com" });
      const { signSessionToken } = await import("../src/services/jwt");
      const token = await signSessionToken({ id: user.id, email: user.email, displayName: null, avatarUrl: null, roleIds: [] });
      const app = createApp(store);
      const res = await app.request("/auth/account", {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      expectSuccess(await res.json());
      expect(await store.findUserById(user.id)).toBeNull();
    });
  });

  // ── Admin ──────────────────────────────────────────

  describe("admin routes", () => {
    let store: FullMemoryStore;
    let adminToken: string;

    beforeEach(async () => {
      store = new FullMemoryStore();
      const { hashPassword } = await import("../src/services/password");
      const user = await store.createUser({
        email: "admin@test.com",
        passwordHash: await hashPassword("Admin123!"),
      });
      seedAdminUser(store, user);
      const { signSessionToken } = await import("../src/services/jwt");
      adminToken = await signSessionToken({
        id: user.id, email: user.email, displayName: null, avatarUrl: null, roleIds: [1],
      });

      // Seed a regular user for management tests
      await store.createUser({
        email: "target@b.com",
        displayName: "Target User",
        passwordHash: "hash",
      });
    });

    it("GET /admin/users lists users", async () => {
      const app = createApp(store);
      const res = await app.request("/admin/users", {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expectSuccess(body);
      expect(body.data.users.length).toBeGreaterThanOrEqual(2);
      expect(body.data.users[0].email).toBeDefined();
    });

    it("GET /admin/users/:id returns user detail", async () => {
      const app = createApp(store);
      const listRes = await app.request("/admin/users", {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const users = (await listRes.json()).data.users;
      const targetId = users.find((u: any) => u.email === "target@b.com").id;

      const res = await app.request(`/admin/users/${targetId}`, {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expectSuccess(body);
      expect(body.data.user.email).toBe("target@b.com");
    });

    it("GET /admin/users/:id returns 404 for unknown user", async () => {
      const app = createApp(store);
      const res = await app.request("/admin/users/unknown-id", {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(404);
      expectApiError(await res.json(), 404, "NOT_FOUND");
    });

    it("PATCH /admin/users/:id updates user", async () => {
      const app = createApp(store);
      const listRes = await app.request("/admin/users", {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const targetId = (await listRes.json()).data.users.find((u: any) => u.email === "target@b.com").id;

      const res = await app.request(`/admin/users/${targetId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ displayName: "Updated" }),
      });
      expect(res.status).toBe(200);
      expect((await res.json()).data.user.displayName).toBe("Updated");
    });

    it("POST /admin/users/:id/roles assigns role", async () => {
      const app = createApp(store);
      store.roleStore.set(2, { id: 2, name: "editor", description: "", createdAt: new Date() });
      const listRes = await app.request("/admin/users", {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const targetId = (await listRes.json()).data.users.find((u: any) => u.email === "target@b.com").id;

      const res = await app.request(`/admin/users/${targetId}/roles`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ roleName: "editor" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expectSuccess(body);
      expect(body.data.roles.some((r: any) => r.name === "editor")).toBe(true);
    });

    it("PATCH /admin/users/:id/ban bans user", async () => {
      const app = createApp(store);
      const listRes = await app.request("/admin/users", {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const targetId = (await listRes.json()).data.users.find((u: any) => u.email === "target@b.com").id;

      const res = await app.request(`/admin/users/${targetId}/ban`, {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: "banned" }),
      });
      expect(res.status).toBe(200);
      expect((await res.json()).data.user.status).toBe("banned");
    });

    it("GET /admin/roles lists roles", async () => {
      const app = createApp(store);
      const res = await app.request("/admin/roles", {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expectSuccess(body);
      expect(body.data.roles.length).toBeGreaterThan(0);
    });

    it("GET /admin/permissions lists permissions", async () => {
      const app = createApp(store);
      const res = await app.request("/admin/permissions", {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expectSuccess(body);
      expect(body.data.permissions.length).toBeGreaterThan(0);
      expect(body.data.permissions[0].code).toBeDefined();
    });

    it("GET /admin/stats returns counts", async () => {
      const app = createApp(store);
      const res = await app.request("/admin/stats", {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expectSuccess(body);
      expect(body.data.userCount).toBeGreaterThanOrEqual(1);
      expect(body.data.roleCount).toBeGreaterThanOrEqual(1);
    });

    it("returns 401 without auth", async () => {
      const app = createApp(store);
      const res = await app.request("/admin/users");
      expect(res.status).toBe(401);
      expectApiError(await res.json(), 401, "UNAUTHORIZED");
    });

    it("returns 403 without permission", async () => {
      // User with no permissions
      const { signSessionToken } = await import("../src/services/jwt");
      const noPermToken = await signSessionToken({
        id: "no-perm-id", email: "noperm@b.com", displayName: null, avatarUrl: null, roleIds: [],
      });
      const app = createApp(store);
      const res = await app.request("/admin/users", {
        headers: { authorization: `Bearer ${noPermToken}` },
      });
      expect(res.status).toBe(403);
      expectApiError(await res.json(), 403, "MISSING_PERMISSION");
    });
  });

  // ── Threads ────────────────────────────────────────

  describe("thread routes", () => {
    let store: FullMemoryStore;
    let token: string;
    let userId: string;

    beforeEach(async () => {
      store = new FullMemoryStore();
      const { hashPassword } = await import("../src/services/password");
      const user = await store.createUser({
        email: "thread@b.com",
        passwordHash: await hashPassword("Secret123!"),
      });
      userId = user.id;
      const { signSessionToken } = await import("../src/services/jwt");
      token = await signSessionToken({
        id: user.id, email: user.email, displayName: null, avatarUrl: null, roleIds: [],
      });
    });

    it("GET /threads returns empty list", async () => {
      const app = createApp(store);
      const res = await app.request("/threads", {
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expectSuccess(body);
      expect(body.data.threads).toEqual([]);
    });

    it("POST /threads creates thread", async () => {
      const app = createApp(store);
      const res = await app.request("/threads", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ tenantId: "tenant-a" }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expectSuccess(body);
      expect(body.data.thread.id).toEqual(expect.any(String));
      expect(body.data.thread.archived).toBe(false);
    });

    it("POST /threads returns 400 without tenantId", async () => {
      const app = createApp(store);
      const res = await app.request("/threads", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      expectApiError(await res.json(), 400, "VALIDATION_ERROR");
    });

    it("GET /threads/:id returns 404 for unknown thread", async () => {
      const app = createApp(store);
      const res = await app.request("/threads/no-such-thread", {
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(404);
      expectApiError(await res.json(), 404, "NOT_FOUND");
    });

    it("PATCH /threads/:id updates thread title", async () => {
      const app = createApp(store);
      const createRes = await app.request("/threads", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ tenantId: "t" }),
      });
      const threadId = (await createRes.json()).data.thread.id;

      const res = await app.request(`/threads/${threadId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Updated Title" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expectSuccess(body);
      expect(body.data.thread.title).toBe("Updated Title");
    });

    it("DELETE /threads/:id deletes thread", async () => {
      const app = createApp(store);
      const createRes = await app.request("/threads", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ tenantId: "t" }),
      });
      const threadId = (await createRes.json()).data.thread.id;

      const res = await app.request(`/threads/${threadId}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      expectSuccess(await res.json());
    });

    it("GET /threads/:id/messages returns empty", async () => {
      const app = createApp(store);
      const createRes = await app.request("/threads", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ tenantId: "t" }),
      });
      const threadId = (await createRes.json()).data.thread.id;

      const res = await app.request(`/threads/${threadId}/messages`, {
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expectSuccess(body);
      expect(body.data.messages).toEqual([]);
    });

    it("PUT /threads/:id/messages stores count", async () => {
      const app = createApp(store);
      const createRes = await app.request("/threads", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ tenantId: "t" }),
      });
      const threadId = (await createRes.json()).data.thread.id;

      const res = await app.request(`/threads/${threadId}/messages`, {
        method: "PUT",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({
          headId: "msg-1",
          messages: [
            {
              parentId: null,
              message: {
                id: "msg-1",
                role: "user",
                createdAt: new Date().toISOString(),
                content: [{ type: "text", text: "hi" }],
              },
            },
          ],
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expectSuccess(body);
      expect(body.data.count).toBe(1);
    });
  });

  // ── Global error handler ───────────────────────────

  describe("global error handler", () => {
    it("handles malformed JSON gracefully", async () => {
      const store = new FullMemoryStore();
      const app = createApp(store);
      const res = await app.request("/auth/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not-json",
      });
      expect(res.status).toBe(400);
      expectApiError(await res.json(), 400, "VALIDATION_ERROR");
    });
  });
});
