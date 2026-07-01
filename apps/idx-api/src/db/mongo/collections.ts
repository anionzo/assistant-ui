/** MongoDB database for idx-api (auth, RBAC, chat threads — one DB per service). */
export const DB_NAME = "idx_api";

export const COLLECTIONS = {
  users: "users",
  oauthAccounts: "oauth_accounts",
  refreshTokens: "refresh_tokens",
  passwordResetTokens: "password_reset_tokens",
  chatThreads: "chat_threads",
  roles: "roles",
  permissions: "permissions",
  rolePermissions: "role_permissions",
  userRoles: "user_roles",
} as const;