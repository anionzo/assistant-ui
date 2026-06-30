"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Search, X } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { asArray, bffJson } from "@/lib/api/bff";
import type { FormSummary } from "@/lib/types/gateway";

export default function FormsListPage() {
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FormSummary[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

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

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    setSearchError("");
    try {
      const payload = await bffJson<unknown>("/api/forms/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      setSearchResults(asArray<FormSummary>(payload, ["forms", "items", "results", "data"]));
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Search failed");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchResults(null);
    setSearchError("");
  }

  const displayed = searchResults ?? forms;
  const isSearchActive = searchResults !== null;

  return (
    <AdminShell
      title="Forms"
      description="Manage structured form templates served by the gateway."
      actions={
        <div className="flex items-center gap-2">
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
        </div>
      }
    >
      {/* Search */}
      <form
        onSubmit={(e) => void handleSearch(e)}
        className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card p-3"
      >
        <Search className="size-4 text-muted-foreground shrink-0" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search forms by keyword…"
          className="flex-1 border-0 bg-transparent p-0 h-auto text-sm shadow-none focus-visible:ring-0"
        />
        {isSearchActive ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearSearch}>
            <X className="size-3.5" />
            Clear
          </Button>
        ) : null}
        <Button type="submit" variant="secondary" size="sm" disabled={searching || !searchQuery.trim()}>
          {searching ? "Searching…" : "Search"}
        </Button>
      </form>

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}
      {searchError ? <StatusBanner tone="error">{searchError}</StatusBanner> : null}
      {isSearchActive && !searching && !searchError ? (
        <StatusBanner tone="info">
          {searchResults !== null && searchResults.length === 0
            ? `No results for "${searchQuery}"`
            : `${searchResults?.length ?? 0} result(s) for "${searchQuery}"`}
        </StatusBanner>
      ) : null}

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
            {loading || searching ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={3}>
                  {searching ? "Searching…" : "Loading forms…"}
                </td>
              </tr>
            ) : displayed.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={3}>
                  {isSearchActive ? "No results found." : "No forms returned from gateway."}
                </td>
              </tr>
            ) : (
              displayed.map((form, index) => {
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
