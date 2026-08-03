import { buildRagMessageCustom } from "@/lib/rag-metadata";
import type { VoiceMetadata } from "@idx/voice-input";

export function extractVoiceAnswer(metadata: VoiceMetadata) {
  if (typeof metadata.answer === "string" && metadata.answer.trim()) {
    return metadata.answer.trim();
  }
  return "";
}

export function buildAssistantMetadata(metadata: VoiceMetadata) {
  if (!metadata.contexts?.length) return undefined;
  const custom = buildRagMessageCustom({
    contexts: metadata.contexts,
    citations: metadata.citations ?? [],
  });
  return custom ? { custom } : undefined;
}