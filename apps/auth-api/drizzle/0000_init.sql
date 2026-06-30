CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "password_hash" text,
  "display_name" text,
  "avatar_url" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");

CREATE TABLE IF NOT EXISTS "oauth_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "provider" text NOT NULL,
  "provider_account_id" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "oauth_accounts_provider_account_idx"
  ON "oauth_accounts" ("provider", "provider_account_id");

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "revoked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "chat_threads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "tenant_id" text NOT NULL,
  "title" text NOT NULL DEFAULT 'Cuộc trò chuyện mới',
  "conversation_id" text NOT NULL,
  "head_message_id" text,
  "archived_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "chat_threads_user_conversation_idx"
  ON "chat_threads" ("user_id", "conversation_id");

CREATE INDEX IF NOT EXISTS "chat_threads_user_updated_idx"
  ON "chat_threads" ("user_id", "updated_at");

CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" text PRIMARY KEY,
  "thread_id" uuid NOT NULL REFERENCES "chat_threads" ("id") ON DELETE CASCADE,
  "parent_id" text,
  "role" text NOT NULL,
  "content" jsonb NOT NULL,
  "run_config" jsonb,
  "created_at" timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS "chat_messages_thread_created_idx"
  ON "chat_messages" ("thread_id", "created_at");
