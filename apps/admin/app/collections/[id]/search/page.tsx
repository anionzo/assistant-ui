"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Search } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { CollectionNav } from "@/components/collection-nav";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { asArray, bffJson } from "@/lib/api/bff";
import type { ChunkHit } from "@/lib/types/gateway";

export default function SearchPage() {
  const params = useParams<{ id: string }>();
  const collectionId = decodeURIComponent(params.id);
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState("5");
  const [hits, setHits] = useState<ChunkHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setHits([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell
      title={`Collection ${collectionId}`}
      description="Test chunk retrieval against this collection."
    >
      <CollectionNav collectionId={collectionId} active="search" />

      <form
        onSubmit={(e) => void runSearch(e)}
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="min-w-[280px] flex-1">
          <label className="mb-1 block text-sm font-medium">Query</label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chunks…"
            required
          />
        </div>
        <div className="w-24">
          <label className="mb-1 block text-sm font-medium">Top K</label>
          <Input value={topK} onChange={(e) => setTopK(e.target.value)} inputMode="numeric" />
        </div>
        <Button type="submit" disabled={loading}>
          <Search className="size-4" />
          {loading ? "Searching…" : "Search"}
        </Button>
      </form>

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}

      <div className="space-y-3">
        {hits.length === 0 && !loading ? (
          <StatusBanner tone="info">Run a query to preview retrieval chunks.</StatusBanner>
        ) : null}
        {hits.map((hit, index) => (
          <article
            key={String(hit.id ?? index)}
            className="rounded-xl border border-border bg-card p-4 text-sm"
          >
            <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>#{index + 1}</span>
              {hit.score !== undefined ? <span>score {String(hit.score)}</span> : null}
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">
              {String(hit.text ?? hit.content ?? JSON.stringify(hit))}
            </p>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}