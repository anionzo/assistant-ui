import type { StreamMetadata } from "@idx/modular-rag-sdk";

export type RagSource = {
  id?: string;
  text: string;
  score?: number;
  metadata?: Record<string, unknown>;
};

export function buildRagMessageCustom(metadata: StreamMetadata | null | undefined) {
  if (!metadata?.contexts?.length) return null;

  return {
    ragContexts: metadata.contexts as RagSource[],
    ragCitations: metadata.citations ?? [],
  };
}