"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { asArray, bffJson } from "@/lib/api/bff";
import type { FormSummary } from "@/lib/types/gateway";

export default function FormsListPage() {
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadForms = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await bffJson<unknown>("/api/forms");
      setForms(asArray<FormSummary>(payload, ["forms", "items", "data"]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load forms");
      setForms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadForms();
  }, [loadForms]);

  return (
    <AdminShell
      title="Forms"
      description="List and manage structured forms served by the gateway."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => void loadForms()} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link
            href="/forms/new"
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" />
            Upload form
          </Link>
        </>
      }
    >
      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={3}>
                  Loading forms…
                </td>
              </tr>
            ) : forms.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={3}>
                  No forms returned from gateway.
                </td>
              </tr>
            ) : (
              forms.map((form, index) => {
                const code = String(form.form_code ?? form.code ?? index);
                return (
                  <tr key={code} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{code}</td>
                    <td className="px-4 py-3">{String(form.title ?? form.name ?? "—")}</td>
                    <td className="px-4 py-3">
                      <Link href={`/forms/${encodeURIComponent(code)}`} className="text-primary hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}