export type Collection = {
  id?: string;
  name?: string;
  description?: string;
  corpus_id?: string;
  [key: string]: unknown;
};

export type CorpusFile = {
  id?: string;
  filename?: string;
  name?: string;
  status?: string;
  [key: string]: unknown;
};

export type CorpusDocument = {
  id?: string;
  title?: string;
  name?: string;
  source?: string;
  [key: string]: unknown;
};

export type ChunkHit = {
  id?: string;
  text?: string;
  content?: string;
  score?: number;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type FormSummary = {
  form_code?: string;
  code?: string;
  title?: string;
  name?: string;
  [key: string]: unknown;
};