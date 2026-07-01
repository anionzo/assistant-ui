import type { ChatRuntimeConfigValue } from "../db/config-types";

export type PublicChatRuntime = ChatRuntimeConfigValue & {
  updatedAt: string | null;
};

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function sanitizeSlug(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  return SLUG_RE.test(trimmed) ? trimmed : null;
}

export function sanitizeDisplayName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 120) return null;
  return trimmed;
}

export function sanitizeTopK(value: number): number | null {
  if (!Number.isInteger(value) || value < 1 || value > 50) return null;
  return value;
}

export function sanitizePipelineId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 120) return null;
  return trimmed;
}