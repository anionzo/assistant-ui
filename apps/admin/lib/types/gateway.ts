export type ParserConfig = {
  chunk_size?: number;
  chunk_overlap?: number;
  language?: string;
  pages?: number[][];
  [key: string]: unknown;
};

export type Collection = {
  id?: string;
  name?: string;
  description?: string | null;
  corpus_id?: string;
  tenant_id?: string;
  parser_config?: ParserConfig;
  [key: string]: unknown;
};

export type CorpusFile = {
  id?: string;
  collection_id?: string;
  filename?: string;
  name?: string;
  status?: string;
  mime_type?: string;
  size_bytes?: number;
  created_at?: string;
  [key: string]: unknown;
};

export type CorpusDocument = {
  id?: string;
  collection_id?: string;
  file_id?: string;
  file_name?: string;
  title?: string;
  name?: string;
  source?: string;
  status?: string;
  progress?: number;
  token_count?: number;
  chunk_count?: number;
  error?: string | null;
  parser_config?: ParserConfig;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type DocumentChunk = {
  id?: string;
  document_id?: string;
  collection_id?: string;
  content?: string;
  text?: string;
  content_type?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ChunkHit = DocumentChunk & {
  score?: number;
};

export type FormSummary = {
  form_code?: string;
  code?: string;
  title?: string;
  name?: string;
  [key: string]: unknown;
};