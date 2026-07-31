/** Align with ModularRAG FormIngestResponse + documents-admin-ui polling. */

/**
 * Orchestrator only accepts .docx (legacy .doc is rejected with 400).
 * @see ModularRAG forms_service.handle_ingest_form
 */
export const FORM_ALLOWED_EXTENSIONS = [".docx"] as const;

export const FORM_POLL_INTERVAL_MS = 3000;
/** ~2 minutes — same window as documents-admin-ui FormDetailPage */
export const FORM_MAX_POLL_ATTEMPTS = 40;

export type FormIngestResult = {
  formCode: string;
  status: string;
  jobId?: string;
  schemaVersion?: string;
  templatePath?: string;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Unwrap gateway / idx-api envelopes when present. */
export function unwrapFormPayload(payload: unknown): Record<string, unknown> {
  const root = asObject(payload);
  if (!root) return {};
  const data = asObject(root.data);
  if (root.success === true && data) return data;
  if (data && (data.form_code != null || data.form_schema != null || data.forms != null)) {
    return data;
  }
  return root;
}

export function parseFormIngestResponse(payload: unknown): FormIngestResult | null {
  const data = unwrapFormPayload(payload);
  const formCode = String(data.form_code ?? data.code ?? "").trim();
  if (!formCode) return null;

  return {
    formCode,
    status: String(data.status ?? "queued"),
    jobId: data.job_id != null ? String(data.job_id) : undefined,
    schemaVersion: data.schema_version != null ? String(data.schema_version) : undefined,
    templatePath: data.template_path != null ? String(data.template_path) : undefined,
  };
}

export function isAllowedFormFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return FORM_ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Ingest is async: right after upload, GET /forms/:code often 404s until the job
 * finishes (doc→docx, schema extract, embedding, OpenSearch). Treat those as
 * "still processing" so the UI can poll instead of showing a hard error.
 */
export function isFormStillProcessingError(error: unknown): boolean {
  if (error && typeof error === "object" && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    if (status === 404) return true;
  }
  const message = error instanceof Error ? error.message : String(error ?? "");
  const m = message.toLowerCase();
  // Match documents-admin-ui FormDetailPage heuristics.
  return m.includes("form not found") || m.includes("404");
}

export function formFileAcceptAttribute(): string {
  return ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}
