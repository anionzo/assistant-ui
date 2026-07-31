"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { useT } from "@idx/i18n";
import { AdminShell } from "@/components/admin-shell";
import { ApiErrorBanner } from "@/components/api-error-banner";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { BffRequestError, bffJson } from "@/lib/api/bff";
import {
  FORM_MAX_POLL_ATTEMPTS,
  FORM_POLL_INTERVAL_MS,
  isFormStillProcessingError,
} from "@/lib/forms/ingest";
import {
  extractFormDetailMeta,
  extractFormSchema,
  type NormalizedFormField,
} from "@/lib/forms/schema";
import {
  clearFormIngestReceipt,
  readFormIngestReceipt,
  readUploadFeedback,
} from "@/lib/forms/upload-feedback";

function FieldRow({ field }: { field: NormalizedFormField }) {
  const t = useT();

  return (
    <tr className="border-b border-border/70 last:border-0">
      <td className="px-4 py-2.5 font-mono text-xs">{field.key}</td>
      <td className="px-4 py-2.5">
        <span className="inline-flex items-center gap-1 rounded bg-muted/50 px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
          {field.type}
        </span>
      </td>
      <td className="px-4 py-2.5">{field.label}</td>
      <td className="px-4 py-2.5">
        {field.required ? (
          <span className="text-xs font-medium text-destructive">{t("common.required")}</span>
        ) : (
          <span className="text-xs text-muted-foreground">{t("common.optional")}</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground">{field.hint ?? "—"}</td>
    </tr>
  );
}

function sourceLabel(source: string) {
  if (source === "need_to_fill") return "need_to_fill";
  if (source === "fields") return "fields";
  if (source === "properties") return "JSON Schema properties";
  return "unknown";
}

export default function FormDetailPage() {
  const t = useT();
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = decodeURIComponent(params.code);
  const feedback = readUploadFeedback(searchParams);

  const [detail, setDetail] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(feedback.processing || feedback.uploaded);
  const [pollAttempt, setPollAttempt] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [receipt] = useState(() => {
    const fromQuery = readUploadFeedback(searchParams);
    const stored = readFormIngestReceipt(code);
    return {
      jobId: fromQuery.jobId ?? stored?.jobId,
      fileName: fromQuery.fileName ?? stored?.fileName,
      status: fromQuery.status ?? stored?.status,
      schemaVersion: fromQuery.schemaVersion ?? stored?.schemaVersion,
      templatePath: stored?.templatePath,
      formCode: stored?.formCode ?? code,
    };
  });
  const [jobId] = useState(receipt.jobId);
  const [fileName] = useState(receipt.fileName);
  const [ingestStatus] = useState(receipt.status);
  const [ingestSchemaVersion] = useState(receipt.schemaVersion);
  const [ingestTemplatePath] = useState(receipt.templatePath);
  const [fromUpload] = useState(feedback.uploaded || feedback.processing);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanUrl = useCallback(() => {
    // Drop query flags only after the form is ready (or permanently failed).
    if (!feedback.uploaded && !feedback.processing) return;
    router.replace(`/forms/${encodeURIComponent(code)}`, { scroll: false });
  }, [feedback.uploaded, feedback.processing, code, router]);

  const loadDetail = useCallback(
    async (attempt: number) => {
      if (cancelledRef.current) return;
      if (attempt === 0) {
        setLoading(true);
        setError(null);
      }

      try {
        const payload = await bffJson<unknown>(`/api/forms/${encodeURIComponent(code)}`);
        if (cancelledRef.current) return;
        setDetail(payload);
        setProcessing(false);
        setLoading(false);
        setError(null);
        setPollAttempt(attempt);
        clearTimer();
        cleanUrl();
        clearFormIngestReceipt(code);
      } catch (e) {
        if (cancelledRef.current) return;

        if (isFormStillProcessingError(e) && attempt < FORM_MAX_POLL_ATTEMPTS) {
          // Ingest job still running — keep processing UI and retry.
          // Keep ?processing=1 in the URL so a refresh continues polling.
          setProcessing(true);
          setLoading(false);
          setDetail(null);
          setError(null);
          setPollAttempt(attempt + 1);
          clearTimer();
          timerRef.current = setTimeout(() => {
            void loadDetail(attempt + 1);
          }, FORM_POLL_INTERVAL_MS);
          return;
        }

        // Still 404 after max polls → timed out waiting for ingest, not a bare "not found".
        if (isFormStillProcessingError(e)) {
          setError(
            new BffRequestError(t("forms.processingTimedOut"), 404, {
              code: "form_processing_timeout",
              requestId: e instanceof BffRequestError ? e.requestId : undefined,
            }),
          );
        } else {
          setError(e);
        }
        setProcessing(false);
        setLoading(false);
        setDetail(null);
        clearTimer();
        cleanUrl();
      }
    },
    [code, clearTimer, cleanUrl, t],
  );

  useEffect(() => {
    cancelledRef.current = false;
    void loadDetail(0);
    return () => {
      cancelledRef.current = true;
      clearTimer();
    };
  }, [loadDetail, clearTimer]);

  async function handleDelete() {
    if (!confirm(t("forms.deleteConfirm", { code }))) return;
    setDeleting(true);
    setError(null);
    try {
      await bffJson(`/api/forms/${encodeURIComponent(code)}`, { method: "DELETE" });
      router.push("/forms");
    } catch (e) {
      setError(e);
    } finally {
      setDeleting(false);
    }
  }

  function handleRetry() {
    setError(null);
    setProcessing(fromUpload);
    void loadDetail(0);
  }

  const meta = extractFormDetailMeta(detail, code);
  const schema = extractFormSchema(detail, code);
  const hasFields = (schema?.fields.length ?? 0) > 0;
  const ready = Boolean(schema) && !processing && !loading;

  return (
    <AdminShell
      title={t("forms.detailTitle", { code: meta.formCode || code })}
      description={t("forms.detailDescription")}
      actions={
        <Button variant="destructive" size="sm" onClick={() => void handleDelete()} disabled={deleting || processing}>
          <Trash2 className="size-4" />
          {deleting ? t("forms.deleting") : t("common.delete")}
        </Button>
      }
    >
      <Link href="/forms" className="mb-4 inline-block text-sm text-primary hover:underline">
        {t("common.backToForms")}
      </Link>

      {processing ? (
        <div className="mb-4 space-y-3">
          <StatusBanner tone="info">
            <div className="flex items-start gap-2">
              <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
              <div className="space-y-1">
                <p className="font-medium">{t("forms.processingTitle")}</p>
                <p>{t("forms.processingBody")}</p>
                <p className="text-xs opacity-70">
                  {t("forms.processingAttempt", {
                    current: Math.min(pollAttempt, FORM_MAX_POLL_ATTEMPTS),
                    max: FORM_MAX_POLL_ATTEMPTS,
                  })}
                </p>
              </div>
            </div>
          </StatusBanner>

          {/* Full FormIngestResponse receipt from POST /forms/ingest */}
          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("forms.ingestReceipt")}
            </h3>
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-medium text-foreground">{t("forms.formCode")}</dt>
                <dd className="font-mono break-all">{receipt.formCode}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">{t("forms.ingestStatus")}</dt>
                <dd>
                  <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 font-mono text-amber-800 ring-1 ring-amber-200">
                    {ingestStatus ?? "queued"}
                  </span>
                </dd>
              </div>
              {jobId ? (
                <div className="sm:col-span-2">
                  <dt className="font-medium text-foreground">{t("forms.jobId")}</dt>
                  <dd className="font-mono break-all text-muted-foreground">{jobId}</dd>
                </div>
              ) : null}
              {ingestSchemaVersion ? (
                <div>
                  <dt className="font-medium text-foreground">{t("forms.schemaVersion")}</dt>
                  <dd className="font-mono">{ingestSchemaVersion}</dd>
                </div>
              ) : null}
              {fileName ? (
                <div>
                  <dt className="font-medium text-foreground">{t("forms.uploadFile")}</dt>
                  <dd className="break-all">{fileName}</dd>
                </div>
              ) : null}
              {ingestTemplatePath ? (
                <div className="sm:col-span-2">
                  <dt className="font-medium text-foreground">{t("forms.templatePath")}</dt>
                  <dd className="break-all font-mono text-muted-foreground">{ingestTemplatePath}</dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">{t("forms.ingestReceiptHint")}</p>
          </div>
        </div>
      ) : null}

      {ready && fromUpload ? (
        <div className="mb-4">
          <StatusBanner tone="success">{t("forms.ingestedBanner")}</StatusBanner>
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 space-y-2">
          <ApiErrorBanner error={error} fallback={t("forms.loadFailed")} />
          <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
            {t("common.tryAgain")}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <StatusBanner tone="info">{t("common.loading")}</StatusBanner>
      ) : processing ? null : !schema ? (
        <StatusBanner tone="info">{t("forms.noSchema")}</StatusBanner>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">{schema.title}</h2>
            {schema.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{schema.description}</p>
            ) : null}
            {meta.keywords?.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {meta.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            ) : null}
            <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <div>
                <dt className="font-medium text-foreground">{t("forms.formCode")}</dt>
                <dd className="font-mono">{meta.formCode}</dd>
              </div>
              {meta.formName ? (
                <div>
                  <dt className="font-medium text-foreground">{t("forms.formName")}</dt>
                  <dd>{meta.formName}</dd>
                </div>
              ) : null}
              <div>
                <dt className="font-medium text-foreground">{t("forms.schemaVersion")}</dt>
                <dd className="font-mono">{meta.schemaVersion ?? "v1"}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">{t("forms.fieldSource")}</dt>
                <dd className="font-mono">{sourceLabel(schema.source)}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">{t("forms.fields")}</dt>
                <dd>{schema.fields.length}</dd>
              </div>
              {meta.templatePath ? (
                <div className="sm:col-span-2">
                  <dt className="font-medium text-foreground">{t("forms.templatePath")}</dt>
                  <dd className="break-all font-mono">{meta.templatePath}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {hasFields ? (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border bg-muted/50 px-4 py-2.5">
                <span className="text-sm font-medium">
                  {t("forms.fieldsCount", { count: schema.fields.length })}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/30 text-muted-foreground">
                    <tr>
                      <th className="w-[180px] px-4 py-2.5 font-medium">{t("forms.colKey")}</th>
                      <th className="w-[110px] px-4 py-2.5 font-medium">{t("forms.colType")}</th>
                      <th className="px-4 py-2.5 font-medium">{t("forms.colLabel")}</th>
                      <th className="w-[90px] px-4 py-2.5 font-medium">{t("common.required")}</th>
                      <th className="px-4 py-2.5 font-medium">{t("forms.colHint")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schema.fields.map((field) => (
                      <FieldRow key={field.key} field={field} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <StatusBanner tone="info">{t("forms.noFieldsYet")}</StatusBanner>
          )}
        </div>
      )}

      {!loading && !processing ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {showRaw ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            {t("forms.rawJson")}
          </button>
          {showRaw ? (
            <pre className="mt-2 max-h-80 overflow-auto rounded-xl border border-border bg-card p-4 text-xs leading-relaxed">
              {JSON.stringify(detail, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}
    </AdminShell>
  );
}
