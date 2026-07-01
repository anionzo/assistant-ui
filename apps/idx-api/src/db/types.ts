export type UserRecord = {
  id: string;
  email: string;
  passwordHash: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ChatThreadRecord = {
  id: string;
  userId: string;
  tenantId: string;
  title: string;
  conversationId: string;
  headMessageId: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ChatMessageRecord = {
  id: string;
  threadId: string;
  parentId: string | null;
  role: string;
  content: Record<string, unknown>;
  runConfig: Record<string, unknown> | null;
  createdAt: Date;
};

export type RoleRecord = {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
};

export type PermissionRecord = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  createdAt: Date;
};

export type OAuthAccountRecord = {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  createdAt: Date;
};

export type CreateUserInput = {
  email: string;
  passwordHash?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

export type CreateOAuthAccountInput = {
  userId: string;
  provider: string;
  providerAccountId: string;
};

export type CreateRefreshTokenInput = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
};

export type RefreshTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type CreateChatThreadInput = {
  userId: string;
  tenantId: string;
  title: string;
  conversationId: string;
};

export type UpdateChatThreadInput = {
  title?: string;
  archived?: boolean;
  headMessageId?: string | null;
};

export type VoiceFormHistoryTurn = {
  role: string;
  text: string;
};

export type VoiceFormSessionRecord = {
  id: string;
  userId: string;
  tenantId: string;
  title: string;
  formCode: string;
  formName: string;
  fieldValues: Record<string, unknown>;
  history: VoiceFormHistoryTurn[];
  decision: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateVoiceFormSessionInput = {
  id?: string;
  userId: string;
  tenantId: string;
  title?: string;
  formCode?: string;
  formName?: string;
};

export type UpdateVoiceFormSessionInput = {
  title?: string;
  formCode?: string;
  formName?: string;
  fieldValues?: Record<string, unknown>;
  history?: VoiceFormHistoryTurn[];
  decision?: string;
};

/**
 * StoredThreadMessage stores the full serialized ThreadMessage in `content`
 * to preserve fields such as `status`, `attachments`, and `metadata` without
 * needing a dedicated column for each one.
 */
export type StoredThreadMessage = {
  id: string;
  parentId: string | null;
  role: string;
  content: Record<string, unknown>;
  runConfig?: Record<string, unknown> | undefined;
  createdAt: Date;
};