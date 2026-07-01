import { ROLES } from "../../services/permissions";

const now = () => new Date();

export const SEED_ROLES = [
  { _id: ROLES.SUPER_ADMIN, name: "super_admin", description: "Full system access — manage users, roles, and all resources", createdAt: now() },
  { _id: ROLES.ADMIN, name: "admin", description: "Operations management — collections, documents, forms, system health", createdAt: now() },
  { _id: ROLES.OPERATOR, name: "operator", description: "Content operations — upload, index, publish documents and manage forms", createdAt: now() },
  { _id: ROLES.VIEWER, name: "viewer", description: "Read-only access — view collections, documents, forms, and status", createdAt: now() },
  { _id: ROLES.USER, name: "user", description: "Default chat user — no admin panel access", createdAt: now() },
  { _id: ROLES.SECURITY_ADMIN, name: "security_admin", description: "Security operator — manage admin IP allowlist and access control", createdAt: now() },
  { _id: ROLES.BRANDING_ADMIN, name: "branding_admin", description: "Branding operator — manage logo and app names for admin and user chat", createdAt: now() },
] as const;

export const SEED_PERMISSIONS = [
  { _id: 10, code: "collections.create", name: "Create collection", description: "Create a new document collection", resource: "collections", action: "create", createdAt: now() },
  { _id: 11, code: "collections.read", name: "Read collections", description: "View collection list and details", resource: "collections", action: "read", createdAt: now() },
  { _id: 12, code: "collections.update", name: "Update collection", description: "Edit collection settings and parser config", resource: "collections", action: "update", createdAt: now() },
  { _id: 13, code: "collections.delete", name: "Delete collection", description: "Remove a collection and its contents", resource: "collections", action: "delete", createdAt: now() },
  { _id: 14, code: "collections.publish", name: "Publish corpus", description: "Publish collection to chat tenant corpus", resource: "collections", action: "publish", createdAt: now() },
  { _id: 20, code: "documents.upload", name: "Upload documents", description: "Upload files and trigger indexing pipeline", resource: "documents", action: "upload", createdAt: now() },
  { _id: 21, code: "documents.read", name: "Read documents", description: "View indexed documents and their chunks", resource: "documents", action: "read", createdAt: now() },
  { _id: 22, code: "documents.delete", name: "Delete documents", description: "Remove a document and its chunks", resource: "documents", action: "delete", createdAt: now() },
  { _id: 23, code: "documents.reprocess", name: "Reprocess documents", description: "Re-queue a document for re-indexing", resource: "documents", action: "reprocess", createdAt: now() },
  { _id: 30, code: "files.upload", name: "Upload files", description: "Upload raw files to collection storage", resource: "files", action: "upload", createdAt: now() },
  { _id: 31, code: "files.read", name: "Read files", description: "View uploaded file list and metadata", resource: "files", action: "read", createdAt: now() },
  { _id: 32, code: "files.delete", name: "Delete files", description: "Remove an uploaded file from storage", resource: "files", action: "delete", createdAt: now() },
  { _id: 40, code: "forms.create", name: "Create forms", description: "Ingest a new form template", resource: "forms", action: "create", createdAt: now() },
  { _id: 41, code: "forms.read", name: "Read forms", description: "View form list, details and schema", resource: "forms", action: "read", createdAt: now() },
  { _id: 42, code: "forms.delete", name: "Delete forms", description: "Remove a form template", resource: "forms", action: "delete", createdAt: now() },
  { _id: 43, code: "forms.search", name: "Search forms", description: "Full-text search across form schemas", resource: "forms", action: "search", createdAt: now() },
  { _id: 50, code: "users.list", name: "List users", description: "View all registered users", resource: "users", action: "list", createdAt: now() },
  { _id: 51, code: "users.read", name: "Read user", description: "View user details and roles", resource: "users", action: "read", createdAt: now() },
  { _id: 52, code: "users.update", name: "Update user", description: "Edit user profile fields", resource: "users", action: "update", createdAt: now() },
  { _id: 53, code: "users.assign_roles", name: "Assign roles", description: "Grant or revoke roles from a user", resource: "users", action: "assign_roles", createdAt: now() },
  { _id: 54, code: "users.ban", name: "Ban user", description: "Lock or unlock a user account", resource: "users", action: "ban", createdAt: now() },
  { _id: 55, code: "users.reset_password", name: "Reset password", description: "Force reset any user's password", resource: "users", action: "reset_password", createdAt: now() },
  { _id: 56, code: "users.delete", name: "Delete user", description: "Permanently delete a user account", resource: "users", action: "delete", createdAt: now() },
  { _id: 57, code: "users.force_logout", name: "Force logout", description: "Revoke all sessions for a user", resource: "users", action: "force_logout", createdAt: now() },
  { _id: 58, code: "security.ip_allowlist", name: "Manage IP allowlist", description: "View and update admin API IP allowlist settings", resource: "security", action: "ip_allowlist", createdAt: now() },
  { _id: 59, code: "settings.branding", name: "Manage branding", description: "Update logo and app branding shown in admin and chat", resource: "settings", action: "branding", createdAt: now() },
  { _id: 60, code: "settings.branding.read", name: "Read branding", description: "View logo and branding settings without editing", resource: "settings", action: "read", createdAt: now() },
] as const;

const ALL_PERMISSION_IDS = SEED_PERMISSIONS.map((p) => p._id);

const ADMIN_RESOURCES = ["collections", "documents", "files", "forms"] as const;

const OPERATOR_CODES = [
  "collections.read",
  "collections.publish",
  "documents.upload",
  "documents.read",
  "documents.delete",
  "documents.reprocess",
  "files.upload",
  "files.read",
  "files.delete",
  "forms.read",
  "forms.search",
] as const;

export function buildRolePermissionPairs(): Array<{ roleId: number; permissionId: number }> {
  const pairs: Array<{ roleId: number; permissionId: number }> = [];

  for (const permissionId of ALL_PERMISSION_IDS) {
    pairs.push({ roleId: ROLES.SUPER_ADMIN, permissionId });
  }

  pairs.push({ roleId: ROLES.SECURITY_ADMIN, permissionId: 58 });
  pairs.push({ roleId: ROLES.BRANDING_ADMIN, permissionId: 59 });
  pairs.push({ roleId: ROLES.BRANDING_ADMIN, permissionId: 60 });

  for (const permission of SEED_PERMISSIONS) {
    if ((ADMIN_RESOURCES as readonly string[]).includes(permission.resource)) {
      pairs.push({ roleId: ROLES.ADMIN, permissionId: permission._id });
    }
    if ((OPERATOR_CODES as readonly string[]).includes(permission.code)) {
      pairs.push({ roleId: ROLES.OPERATOR, permissionId: permission._id });
    }
    if (permission.action === "read") {
      pairs.push({ roleId: ROLES.VIEWER, permissionId: permission._id });
    }
  }

  return pairs;
}