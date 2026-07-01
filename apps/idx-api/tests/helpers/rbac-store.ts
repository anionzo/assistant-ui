import type { AuthStore } from "../../src/db/store";
import type { PermissionRecord, RoleRecord, UserRecord } from "../../src/db/schema";
import { PERMISSIONS } from "../../src/services/permissions";

type UserInput = {
  email: string;
  displayName?: string;
};

export class RbacTestStore implements AuthStore {
  private users = new Map<string, UserRecord>();
  private roleStore = new Map<number, RoleRecord>();
  private permStore = new Map<number, PermissionRecord>();
  private userRolesMap = new Map<string, Set<number>>();
  private rolePermMap = new Map<number, Set<number>>();

  constructor() {
    this.seedRbac();
  }

  private seedRbac() {
    const roles: RoleRecord[] = [
      { id: 1, name: "super_admin", description: null, createdAt: new Date() },
      { id: 2, name: "admin", description: null, createdAt: new Date() },
      { id: 3, name: "operator", description: null, createdAt: new Date() },
      { id: 4, name: "viewer", description: null, createdAt: new Date() },
      { id: 5, name: "user", description: null, createdAt: new Date() },
      { id: 6, name: "security_admin", description: null, createdAt: new Date() },
    ];
    for (const role of roles) this.roleStore.set(role.id, role);

    const permissions = Object.entries(PERMISSIONS).map(([key, code], index) => ({
      id: 10 + index,
      code,
      description: key,
      createdAt: new Date(),
    })) as PermissionRecord[];

    for (const permission of permissions) this.permStore.set(permission.id, permission);

    const operatorPerms = permissions
      .filter((p) =>
        [
          PERMISSIONS.COLLECTIONS_READ,
          PERMISSIONS.DOCUMENTS_READ,
          PERMISSIONS.DOCUMENTS_UPLOAD,
          PERMISSIONS.FILES_READ,
          PERMISSIONS.FORMS_READ,
          PERMISSIONS.FORMS_CREATE,
        ].includes(p.code as (typeof PERMISSIONS)[keyof typeof PERMISSIONS]),
      )
      .map((p) => p.id);

    this.rolePermMap.set(3, new Set(operatorPerms));
    this.rolePermMap.set(1, new Set(permissions.map((p) => p.id)));
  }

  async createUser(input: UserInput & { passwordHash?: string | null }) {
    const user: UserRecord = {
      id: crypto.randomUUID(),
      email: input.email,
      passwordHash: null,
      displayName: input.displayName ?? null,
      avatarUrl: null,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async assignRole(userId: string, roleId: number) {
    const set = this.userRolesMap.get(userId) ?? new Set<number>();
    set.add(roleId);
    this.userRolesMap.set(userId, set);
  }

  async findUserById(id: string) {
    return this.users.get(id) ?? null;
  }

  async findUserByEmail(email: string) {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async findUserRoles(userId: string) {
    const roleIds = this.userRolesMap.get(userId);
    if (!roleIds) return [];
    return [...roleIds]
      .map((id) => this.roleStore.get(id))
      .filter((role): role is RoleRecord => !!role);
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
    await this.assignRole(userId, role.id);
  }

  // Unused AuthStore methods for gateway security tests
  async findOAuthAccount() {
    return null;
  }
  async createOAuthAccount() {}
  async createRefreshToken() {}
  async findValidRefreshToken() {
    return null;
  }
  async revokeRefreshToken() {}
  async listThreads() {
    return [];
  }
  async findThreadById() {
    return null;
  }
  async createThread() {
    throw new Error("not implemented");
  }
  async updateThread() {
    return null;
  }
  async deleteThread() {
    return false;
  }
  async listThreadMessages() {
    return [];
  }
  async replaceThreadMessages() {
    return 0;
  }
  async revokeUserRole() {}
  async listAllUsers() {
    return [];
  }
  async countUsers() {
    return 0;
  }
  async listUsersPage() {
    return {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
      items: [],
    };
  }
  async listThreadsPage() {
    return {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
      items: [],
    };
  }
  async updateUser() {
    return null;
  }
  async setUserPassword() {}
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
      .filter((perm): perm is PermissionRecord => !!perm);
  }
  async assignRolePermission(roleId: number, permissionId: number) {
    const set = this.rolePermMap.get(roleId) ?? new Set<number>();
    set.add(permissionId);
    this.rolePermMap.set(roleId, set);
  }
  async revokeRolePermission(roleId: number, permissionId: number) {
    const set = this.rolePermMap.get(roleId);
    if (set) set.delete(permissionId);
  }
  async setUserStatus() {}
  async revokeAllUserTokens() {}
  async deleteUserAccount() {
    return false;
  }
  async createResetToken() {}
  async findValidResetToken() {
    return null;
  }
  async consumeResetToken() {}
}