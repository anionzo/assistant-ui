"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { bffJson } from "@/lib/api/bff";

type FormField = {
  name?: string;
  type?: string;
  label?: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value?: string; label?: string }>;
  [key: string]: unknown;
};

type FormSchema = {
  title?: string;
  description?: string;
  fields?: FormField[];
  [key: string]: unknown;
};

function extractSchema(detail: unknown): FormSchema | null {
  if (!detail || typeof detail !== "object") return null;
  const d = detail as Record<string, unknown>;
  const schema = (d.schema ?? d.form_schema ?? d.definition) as Record<string, unknown> | undefined;
  if (!schema || typeof schema !== "object") return null;
  return {
    title: typeof schema.title === "string" ? schema.title : undefined,
    description: typeof schema.description === "string" ? schema.description : undefined,
    fields: Array.isArray(schema.fields) ? (schema.fields as FormField[]) : undefined,
  };
}

function FieldRow({ field }: { field: FormField }) {
  const name = field.name ?? "—";
  const type = field.type ?? "text";
  const label = field.label ?? name;
  const required = field.required === true;

  return (
    <tr className="border-b border-border/70 last:border-0">
      <td className="px-4 py-2.5 font-mono text-xs">{name}</td>
      <td className="px-4 py-2.5">
        <span className="inline-flex items-center gap-1 rounded bg-muted/50 px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
          {type}
        </span>
      </td>
      <td className="px-4 py-2.5">{label}</td>
      <td className="px-4 py-2.5">
        {required ? (
          <span className="text-xs text-destructive font-medium">Required</span>
        ) : (
          <span className="text-xs text-muted-foreground">Optional</span>
        )}
      </td>
    </tr>
  );
}

export default function FormDetailPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = decodeURIComponent(params.code);
  const [detail, setDetail] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showRaw, setShowRaw] = useState(false);

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

  const schema = extractSchema(detail);
  const meta = detail && typeof detail === "object" ? (detail as Record<string, unknown>) : {};
  const title = schema?.title ?? String(meta.title ?? meta.name ?? code);
  const description = schema?.description ?? (typeof meta.description === "string" ? meta.description : undefined);

  return (
    <AdminShell
      title={`Form ${code}`}
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

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}

      {loading ? (
        <StatusBanner tone="info">Loading…</StatusBanner>
      ) : schema?.fields ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border bg-muted/50 px-4 py-2.5">
              <span className="text-sm font-medium">
                Fields ({schema.fields.length})
              </span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium w-[160px]">Name</th>
                  <th className="px-4 py-2.5 font-medium w-[100px]">Type</th>
                  <th className="px-4 py-2.5 font-medium">Label</th>
                  <th className="px-4 py-2.5 font-medium w-[90px]">Required</th>
                </tr>
              </thead>
              <tbody>
                {schema.fields.map((field, i) => (
                  <FieldRow key={field.name ?? i} field={field} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <StatusBanner tone="info">No schema fields detected — form may use a different format.</StatusBanner>
      )}

      {/* Raw JSON toggle */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowRaw(!showRaw)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showRaw ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          Raw JSON
        </button>
        {showRaw ? (
          <pre className="mt-2 overflow-auto rounded-xl border border-border bg-card p-4 text-xs leading-relaxed max-h-80">
            {JSON.stringify(detail, null, 2)}
          </pre>
        ) : null}
      </div>
    </AdminShell>
  );
}
