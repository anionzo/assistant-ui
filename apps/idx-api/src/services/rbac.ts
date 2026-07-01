import { type AuthStore, getAuthStore } from "../db/store";
import { ROLES } from "./permissions";

export type ResolvedRoles = Array<{ id: number; name: string }>;

export async function resolveUserRoles(userId: string, store: AuthStore = getAuthStore()) {
  const roles = await store.findUserRoles(userId);
  return roles.map((r) => ({ id: r.id, name: r.name }));
}

export async function resolveUserPermissions(userId: string, store: AuthStore = getAuthStore()) {
  return store.findUserPermissionCodes(userId);
}

export async function resolveUserPermissionIds(userId: string, store: AuthStore = getAuthStore()) {
  return store.findUserPermissionIds(userId);
}

export async function ensureAdminSeed(store: AuthStore = getAuthStore()) {
  const seedEmail = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  if (!seedEmail) return;

  try {
    const user = await store.findUserByEmail(seedEmail);
    if (user) {
      await store.ensureUserRole(user.id, "super_admin");
      console.info(`[rbac] super_admin role (id=${ROLES.SUPER_ADMIN}) assigned to ${seedEmail}`);
    }
  } catch (error) {
    console.error("[rbac] failed to seed admin:", error);
  }
}
