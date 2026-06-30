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

  // users (50-53)
  USERS_LIST:         50,
  USERS_READ:         51,
  USERS_UPDATE:       52,
  USERS_ASSIGN_ROLES: 53,
} as const;
