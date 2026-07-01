"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, RefreshCw, Search, X } from "lucide-react";
import { useT } from "@idx/i18n";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination";
import { Table, TableRow, TableCell, TableEmpty, TableLoading } from "@/components/ui/table";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { asArray, bffJson } from "@/lib/api/bff";
import type { FormSummary } from "@/lib/types/gateway";
import { readUploadFeedback } from "@/lib/forms/upload-feedback";

export default function FormsListPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FormSummary[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showUploadedBanner, setShowUploadedBanner] = useState(false);

  useEffect(() => {
    const feedback = readUploadFeedback(searchParams);
    if (!feedback.uploaded) return;
    setShowUploadedBanner(true);
    router.replace("/forms", { scroll: false });
  }, [searchParams, router]);

  const displayed = searchResults ?? forms;
  const {
    items: pageItems,
    meta,
    rowOffset,
    setPage,
    pageSize,
    setPageSize,
  } = useClientPagination(displayed);
  const isSearchActive = searchResults !== null;

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
      setPage(1);
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
    setPage(1);
  }

  const tableLoading = loading || searching;

  return (
    <AdminShell
      title={t("forms.title")}
      description={t("forms.description")}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadForms()} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            {t("common.refresh")}
          </Button>
          <Link
            href="/forms/new"
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" />
            {t("forms.uploadForm")}
          </Link>
        </div>
      }
    >
      <form
        onSubmit={(e) => void handleSearch(e)}
        className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card p-3"
      >
        <Search className="size-4 text-muted-foreground shrink-0" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("forms.searchPlaceholder")}
          className="flex-1 border-0 bg-transparent p-0 h-auto text-sm shadow-none focus-visible:ring-0"
        />
        {isSearchActive ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearSearch}>
            <X className="size-3.5" />
            {t("common.clear")}
          </Button>
        ) : null}
        <Button type="submit" variant="secondary" size="sm" disabled={searching || !searchQuery.trim()}>
          {searching ? t("common.searching") : t("common.search")}
        </Button>
      </form>

      {showUploadedBanner ? (
        <StatusBanner tone="success">{t("forms.uploadedBanner")}</StatusBanner>
      ) : null}

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}
      {searchError ? <StatusBanner tone="error">{searchError}</StatusBanner> : null}
      {isSearchActive && !searching && !searchError ? (
        <StatusBanner tone="info">
          {searchResults !== null && searchResults.length === 0
            ? t("forms.noSearchResults", { query: searchQuery })
            : t("forms.searchResults", { count: searchResults?.length ?? 0, query: searchQuery })}
        </StatusBanner>
      ) : null}

      <Table
        headers={[t("common.colIndex"), t("forms.colCode"), t("forms.colTitle"), t("common.colActions")]}
        footer={
          !tableLoading && displayed.length > 0 ? (
            <PaginationBar meta={meta} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          ) : null
        }
      >
        {tableLoading ? (
          <TableLoading colSpan={4} message={searching ? t("common.searching") : t("forms.loading")} />
        ) : displayed.length === 0 ? (
          <TableEmpty colSpan={4} message={isSearchActive ? t("forms.emptySearch") : t("forms.emptyGateway")} />
        ) : (
          pageItems.map((form, index) => {
            const code = String(form.form_code ?? form.code ?? index);
            return (
              <TableRow key={code}>
                <TableCell className="w-12 text-muted-foreground">{rowOffset + index + 1}</TableCell>
                <TableCell className="font-mono text-xs">{code}</TableCell>
                <TableCell>{String(form.form_name ?? form.title ?? form.name ?? "—")}</TableCell>
                <TableCell>
                  <Link href={`/forms/${encodeURIComponent(code)}`} className="text-primary hover:underline">
                    {t("common.view")}
                  </Link>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </Table>
    </AdminShell>
  );
}