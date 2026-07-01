"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Search } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { CollectionNav } from "@/components/collection-nav";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { asArray, bffJson } from "@/lib/api/bff";
import type { ChunkHit } from "@/lib/types/gateway";
import { useT } from "@idx/i18n";

export default function SearchPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const collectionId = decodeURIComponent(params.id);
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState("5");
  const [hits, setHits] = useState<ChunkHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const {
    items: pageHits,
    meta,
    rowOffset,
    setPage,
    pageSize,
    setPageSize,
  } = useClientPagination(hits, { pageSize: 5 });

  async function runSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    try {
      const payload = await bffJson<unknown>("/api/documents/chunks/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          collection_id: collectionId,
          top_k: Number(topK) || 5,
        }),
      });
      setHits(asArray<ChunkHit>(payload, ["chunks", "results", "hits", "items", "data"]));
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("collections.searchFailed"));
      setHits([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell
      title={t("collections.collectionTitle", { id: collectionId })}
      description={t("collections.searchTitle")}
      sidebarContent={<CollectionNav collectionId={collectionId} active="search" />}
    >
      <StatusBanner tone="info">
        {t("collections.search404HintBefore")}{" "}
        <strong>{t("collections.search404HintLink")}</strong>{" "}
        {t("collections.search404HintAfter")}
      </StatusBanner>

      <form
        onSubmit={(e) => void runSearch(e)}
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="min-w-[280px] flex-1">
          <label className="mb-1 block text-sm font-medium">{t("collections.query")}</label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("collections.searchPlaceholder")}
            required
          />
        </div>
        <div className="w-24">
          <label className="mb-1 block text-sm font-medium">{t("collections.topK")}</label>
          <Input value={topK} onChange={(e) => setTopK(e.target.value)} inputMode="numeric" />
        </div>
        <Button type="submit" disabled={loading}>
          <Search className="size-4" />
          {loading ? t("common.searching") : t("common.search")}
        </Button>
      </form>

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}

      <div className="space-y-3">
        {hits.length === 0 && !loading ? (
          <StatusBanner tone="info">{t("collections.searchHint")}</StatusBanner>
        ) : null}
        {pageHits.map((hit, index) => (
          <article
            key={String(hit.id ?? rowOffset + index)}
            className="rounded-xl border border-border bg-card p-4 text-sm"
          >
            <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {t("common.colIndex")} {rowOffset + index + 1}
              </span>
              {hit.score !== undefined ? (
                <span>
                  {t("collections.score")} {String(hit.score)}
                </span>
              ) : null}
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">
              {String(hit.text ?? hit.content ?? JSON.stringify(hit))}
            </p>
          </article>
        ))}
      </div>

      {hits.length > 0 ? (
        <PaginationBar
          variant="standalone"
          className="mt-4"
          meta={meta}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      ) : null}
    </AdminShell>
  );
}