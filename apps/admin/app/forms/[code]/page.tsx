"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { bffJson } from "@/lib/api/bff";
import {
  extractFormDetailMeta,
  extractFormSchema,
  type NormalizedFormField,
} from "@/lib/forms/schema";
import { readUploadFeedback } from "@/lib/forms/upload-feedback";

function FieldRow({ field }: { field: NormalizedFormField }) {
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
          <span className="text-xs font-medium text-destructive">Required</span>
        ) : (
          <span className="text-xs text-muted-foreground">Optional</span>
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
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = decodeURIComponent(params.code);
  const [detail, setDetail] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<{ fileName?: string } | null>(null);

  useEffect(() => {
    const feedback = readUploadFeedback(searchParams);
    if (!feedback.uploaded) return;
    setUploadNotice({ fileName: feedback.fileName });
    router.replace(`/forms/${encodeURIComponent(code)}`, { scroll: false });
  }, [searchParams, code, router]);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await bffJson<unknown>(`/api/forms/${encodeURIComponent(code)}`);
      setDetail(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load form");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  async function handleDelete() {
    if (!confirm(`Delete form ${code}?`)) return;
    setDeleting(true);
    setError("");
    try {
      await bffJson(`/api/forms/${encodeURIComponent(code)}`, { method: "DELETE" });
      router.push("/forms");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const meta = extractFormDetailMeta(detail, code);
  const schema = extractFormSchema(detail, code);
  const hasFields = (schema?.fields.length ?? 0) > 0;

  return (
    <AdminShell
      title={`Form ${meta.formCode || code}`}
      description="Schema preview and raw JSON view."
      actions={
        <Button variant="destructive" size="sm" onClick={() => void handleDelete()} disabled={deleting}>
          <Trash2 className="size-4" />
          {deleting ? "Deleting…" : "Delete"}
        </Button>
      }
    >
      <Link href="/forms" className="mb-4 inline-block text-sm text-primary hover:underline">
        ← Back to forms
      </Link>

      {uploadNotice ? (
        <div className="mb-4">
          <StatusBanner tone="success">
            Form ingested successfully
            {uploadNotice.fileName ? ` from ${uploadNotice.fileName}` : ""}. Review the schema below.
          </StatusBanner>
        </div>
      ) : null}

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}

      {loading ? (
        <StatusBanner tone="info">Loading…</StatusBanner>
      ) : !schema ? (
        <StatusBanner tone="info">
          No form schema found in gateway response — check Raw JSON for the payload shape.
        </StatusBanner>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">{schema.title}</h2>
            {schema.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{schema.description}</p>
            ) : null}
            <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <div>
                <dt className="font-medium text-foreground">Form code</dt>
                <dd className="font-mono">{meta.formCode}</dd>
              </div>
              {meta.formName ? (
                <div>
                  <dt className="font-medium text-foreground">Form name</dt>
                  <dd>{meta.formName}</dd>
                </div>
              ) : null}
              <div>
                <dt className="font-medium text-foreground">Field source</dt>
                <dd className="font-mono">{sourceLabel(schema.source)}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Fields</dt>
                <dd>{schema.fields.length}</dd>
              </div>
            </dl>
          </div>

          {hasFields ? (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border bg-muted/50 px-4 py-2.5">
                <span className="text-sm font-medium">Fields ({schema.fields.length})</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/30 text-muted-foreground">
                    <tr>
                      <th className="w-[180px] px-4 py-2.5 font-medium">Key</th>
                      <th className="w-[110px] px-4 py-2.5 font-medium">Type</th>
                      <th className="px-4 py-2.5 font-medium">Label</th>
                      <th className="w-[90px] px-4 py-2.5 font-medium">Required</th>
                      <th className="px-4 py-2.5 font-medium">Hint</th>
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
            <StatusBanner tone="info">
              Schema loaded but no fillable fields were found. The form may still be valid for voice-fill if
              fields are generated at runtime — inspect Raw JSON.
            </StatusBanner>
          )}
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowRaw(!showRaw)}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {showRaw ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          Raw JSON
        </button>
        {showRaw ? (
          <pre className="mt-2 max-h-80 overflow-auto rounded-xl border border-border bg-card p-4 text-xs leading-relaxed">
            {JSON.stringify(detail, null, 2)}
          </pre>
        ) : null}
      </div>
    </AdminShell>
  );
}