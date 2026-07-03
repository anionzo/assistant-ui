// Permission IDs — fixed from auth-api migration 0001_rbac.sql
// Do NOT reorder; IDs map to DB seed data.

export const P = {
  // collections (10-14)
  COLLECTIONS_CREATE:  10,
  COLLECTIONS_READ:    11,
  COLLECTIONS_UPDATE:  12,
  COLLECTIONS_DELETE:  13,
  COLLECTIONS_PUBLISH: 14,

  // documents (20-23)
  DOCUMENTS_UPLOAD:    20,
  DOCUMENTS_READ:      21,
  DOCUMENTS_DELETE:    22,
  DOCUMENTS_REPROCESS: 23,

  // files (30-32)
  FILES_UPLOAD: 30,
  FILES_READ:   31,
  FILES_DELETE: 32,

  // forms (40-43)
  FORMS_CREATE: 40,
  FORMS_READ:   41,
  FORMS_DELETE: 42,
  FORMS_SEARCH: 43,

  // users (50-57)
  USERS_LIST:         50,
  USERS_READ:         51,
  USERS_UPDATE:       52,
  USERS_ASSIGN_ROLES: 53,
  USERS_BAN:          54,
  USERS_RESET_PASSWORD: 55,
  USERS_DELETE:        56,
  USERS_FORCE_LOGOUT:  57,

  // security (58)
  SECURITY_IP_ALLOWLIST: 58,

  // settings (59-62)
  SETTINGS_BRANDING:      59,
  SETTINGS_BRANDING_READ: 60,
  SETTINGS_RUNTIME:       61,
  SETTINGS_RUNTIME_READ:  62,
  SETTINGS_LEGAL:         63,
  SETTINGS_LEGAL_READ:    64,
} as const;

export const PERMISSION_CODES = {
  SECURITY_IP_ALLOWLIST: "security.ip_allowlist",
  SETTINGS_BRANDING: "settings.branding",
  SETTINGS_BRANDING_READ: "settings.branding.read",
  SETTINGS_RUNTIME: "settings.runtime",
  SETTINGS_RUNTIME_READ: "settings.runtime.read",
  SETTINGS_LEGAL: "settings.legal",
  SETTINGS_LEGAL_READ: "settings.legal.read",
} as const;

export function hasPermissionCode(permissions: string[], code: string): boolean {
  return permissions.includes(code);
}

export function hasAnyPermissionCode(permissions: string[], codes: string[]): boolean {
  return codes.some((code) => permissions.includes(code));
}
