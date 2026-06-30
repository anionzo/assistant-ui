export type ContextItem = {
  id?: string;
  text: string;
  score?: number;
  metadata?: Record<string, unknown>;
};

export type StreamMetadata = {
  answer?: string;
  contexts?: ContextItem[];
  citations?: unknown[];
  model?: string;
  usage?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ParsedStreamEvent =
  | { type: "token"; token: string }
  | { type: "metadata"; metadata: StreamMetadata }
  | { type: "done" }
  | { type: "error"; message: string; details?: unknown };
