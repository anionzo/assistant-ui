// Permission codes — fixed IDs from migration 0001_rbac.sql
// Do NOT reorder; IDs are baked into seed data.

export const PERMISSIONS = {
  // collections (10-14)
  COLLECTIONS_CREATE:  "collections.create",
  COLLECTIONS_READ:    "collections.read",
  COLLECTIONS_UPDATE:  "collections.update",
  COLLECTIONS_DELETE:  "collections.delete",
  COLLECTIONS_PUBLISH: "collections.publish",

  // documents (20-23)
  DOCUMENTS_UPLOAD:    "documents.upload",
  DOCUMENTS_READ:      "documents.read",
  DOCUMENTS_DELETE:    "documents.delete",
  DOCUMENTS_REPROCESS: "documents.reprocess",

  // files (30-32)
  FILES_UPLOAD: "files.upload",
  FILES_READ:   "files.read",
  FILES_DELETE: "files.delete",

  // forms (40-43)
  FORMS_CREATE: "forms.create",
  FORMS_READ:   "forms.read",
  FORMS_DELETE: "forms.delete",
  FORMS_SEARCH: "forms.search",

  // users (50-57)
  USERS_LIST:         "users.list",
  USERS_READ:         "users.read",
  USERS_UPDATE:       "users.update",
  USERS_ASSIGN_ROLES: "users.assign_roles",
  USERS_BAN:          "users.ban",
  USERS_RESET_PASSWORD: "users.reset_password",
  USERS_DELETE:       "users.delete",
  USERS_FORCE_LOGOUT: "users.force_logout",

  // security (58)
  SECURITY_IP_ALLOWLIST: "security.ip_allowlist",

  // settings (59-62)
  SETTINGS_BRANDING:      "settings.branding",
  SETTINGS_BRANDING_READ: "settings.branding.read",
  SETTINGS_RUNTIME:       "settings.runtime",
  SETTINGS_RUNTIME_READ:  "settings.runtime.read",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Role IDs — fixed IDs from migration 0001_rbac.sql
export const ROLES = {
  SUPER_ADMIN: 1,
  ADMIN:       2,
  OPERATOR:    3,
  VIEWER:      4,
  USER:           5,
  SECURITY_ADMIN: 6,
  BRANDING_ADMIN: 7,
} as const;

export type RoleId = (typeof ROLES)[keyof typeof ROLES];
