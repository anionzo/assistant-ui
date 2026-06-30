"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { bffJson } from "@/lib/api/bff";

export default function FormDetailPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = decodeURIComponent(params.code);
  const [detail, setDetail] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <AdminShell
      title={`Form ${code}`}
      description="Gateway form detail (raw JSON preview)."
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

      <pre className="mt-4 overflow-auto rounded-xl border border-border bg-card p-4 text-xs leading-relaxed">
        {loading ? "Loading…" : JSON.stringify(detail, null, 2)}
      </pre>
    </AdminShell>
  );
}