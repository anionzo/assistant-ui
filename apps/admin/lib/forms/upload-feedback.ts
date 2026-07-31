import type { FormIngestResult } from "@/lib/forms/ingest";

export const FORM_UPLOADED_QUERY = "uploaded";
export const FORM_UPLOADED_FILE_QUERY = "file";
export const FORM_PROCESSING_QUERY = "processing";
export const FORM_JOB_QUERY = "job";
export const FORM_STATUS_QUERY = "status";
export const FORM_SCHEMA_VERSION_QUERY = "sv";

/** sessionStorage key for full ingest receipt (template_path can be long for URL). */
export function formIngestReceiptKey(formCode: string) {
  return `idx.form.ingest.${formCode}`;
}

export type FormIngestReceipt = FormIngestResult & {
  fileName?: string;
  savedAt: number;
};

export type FormUploadFeedback = {
  uploaded: boolean;
  processing: boolean;
  fileName?: string;
  jobId?: string;
  status?: string;
  schemaVersion?: string;
  templatePath?: string;
};

export function saveFormIngestReceipt(receipt: FormIngestReceipt) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(formIngestReceiptKey(receipt.formCode), JSON.stringify(receipt));
  } catch {
    // ignore quota / private mode
  }
}

export function readFormIngestReceipt(formCode: string): FormIngestReceipt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(formIngestReceiptKey(formCode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FormIngestReceipt;
    if (!parsed?.formCode) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearFormIngestReceipt(formCode: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(formIngestReceiptKey(formCode));
  } catch {
    // ignore
  }
}

export function formDetailHref(
  code: string,
  opts?: {
    uploaded?: boolean;
    processing?: boolean;
    fileName?: string;
    jobId?: string;
    status?: string;
    schemaVersion?: string;
  },
): string {
  const path = `/forms/${encodeURIComponent(code)}`;
  const params = new URLSearchParams();
  if (opts?.uploaded) params.set(FORM_UPLOADED_QUERY, "1");
  if (opts?.processing) params.set(FORM_PROCESSING_QUERY, "1");
  if (opts?.fileName) params.set(FORM_UPLOADED_FILE_QUERY, opts.fileName);
  if (opts?.jobId) params.set(FORM_JOB_QUERY, opts.jobId);
  if (opts?.status) params.set(FORM_STATUS_QUERY, opts.status);
  if (opts?.schemaVersion) params.set(FORM_SCHEMA_VERSION_QUERY, opts.schemaVersion);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function formsListHref(opts?: { uploaded?: boolean } | boolean): string {
  const uploaded = typeof opts === "boolean" ? opts : Boolean(opts?.uploaded);
  return uploaded ? `/forms?${FORM_UPLOADED_QUERY}=1` : "/forms";
}

export function readUploadFeedback(searchParams: URLSearchParams): FormUploadFeedback {
  const uploaded = searchParams.get(FORM_UPLOADED_QUERY) === "1";
  const processing = searchParams.get(FORM_PROCESSING_QUERY) === "1";
  const fileName = searchParams.get(FORM_UPLOADED_FILE_QUERY)?.trim() || undefined;
  const jobId = searchParams.get(FORM_JOB_QUERY)?.trim() || undefined;
  const status = searchParams.get(FORM_STATUS_QUERY)?.trim() || undefined;
  const schemaVersion = searchParams.get(FORM_SCHEMA_VERSION_QUERY)?.trim() || undefined;
  return { uploaded, processing, fileName, jobId, status, schemaVersion };
}
