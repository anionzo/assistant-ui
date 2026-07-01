import {
  CONFIG_DEFAULTS,
  CONFIG_KEYS,
  type ChatRuntimeConfigValue,
} from "../db/config-types";
import { getAppConfig, setAppConfig } from "../db/mongo/config-store";
import {
  sanitizeDisplayName,
  sanitizePipelineId,
  sanitizeSlug,
  sanitizeTopK,
  type PublicChatRuntime,
} from "../utils/chat-runtime";

function toPublicRuntime(
  record: Awaited<ReturnType<typeof getAppConfig<typeof CONFIG_KEYS.systemChatRuntime>>>,
): PublicChatRuntime {
  return {
    ...record.value,
    updatedAt: record.updatedAt,
  };
}

export async function getChatRuntimeSettings(): Promise<PublicChatRuntime> {
  const record = await getAppConfig(CONFIG_KEYS.systemChatRuntime);
  return toPublicRuntime(record);
}

export async function updateChatRuntimeSettings(input: {
  tenantId?: string;
  tenantDisplayName?: string;
  defaultCorpusId?: string;
  defaultChatPipeline?: string;
  defaultVoicePipeline?: string;
  defaultTopK?: number;
  updatedBy: string;
}): Promise<PublicChatRuntime> {
  const current = await getAppConfig(CONFIG_KEYS.systemChatRuntime);
  const defaults = CONFIG_DEFAULTS[CONFIG_KEYS.systemChatRuntime].value;
  const value: ChatRuntimeConfigValue = { ...current.value };

  if (input.tenantId !== undefined) {
    const sanitized = sanitizeSlug(input.tenantId);
    if (!sanitized) throw new Error("invalid_tenant_id");
    value.tenantId = sanitized;
  }
  if (input.tenantDisplayName !== undefined) {
    const sanitized = sanitizeDisplayName(input.tenantDisplayName);
    if (!sanitized) throw new Error("invalid_tenant_display_name");
    value.tenantDisplayName = sanitized;
  }
  if (input.defaultCorpusId !== undefined) {
    const sanitized = sanitizeSlug(input.defaultCorpusId);
    if (!sanitized) throw new Error("invalid_corpus_id");
    value.defaultCorpusId = sanitized;
  }
  if (input.defaultChatPipeline !== undefined) {
    const sanitized = sanitizePipelineId(input.defaultChatPipeline);
    if (!sanitized) throw new Error("invalid_chat_pipeline");
    value.defaultChatPipeline = sanitized;
  }
  if (input.defaultVoicePipeline !== undefined) {
    const sanitized = sanitizePipelineId(input.defaultVoicePipeline);
    if (!sanitized) throw new Error("invalid_voice_pipeline");
    value.defaultVoicePipeline = sanitized;
  }
  if (input.defaultTopK !== undefined) {
    const sanitized = sanitizeTopK(input.defaultTopK);
    if (sanitized === null) throw new Error("invalid_top_k");
    value.defaultTopK = sanitized;
  }

  if (!value.tenantId) value.tenantId = defaults.tenantId;
  if (!value.tenantDisplayName) value.tenantDisplayName = defaults.tenantDisplayName;

  const saved = await setAppConfig(CONFIG_KEYS.systemChatRuntime, value, {
    updatedBy: input.updatedBy,
  });
  return toPublicRuntime(saved);
}