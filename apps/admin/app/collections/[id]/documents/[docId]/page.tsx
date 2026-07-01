"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RefreshCw, RotateCcw } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { CollectionNav } from "@/components/collection-nav";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { PaginationBar } from "@/components/ui/pagination";
import { useClientPagination } from "@/hooks/use-client-pagination";
import {
  getDocument,
  listDocumentChunks,
  reprocessDocument,
} from "@/lib/api/collections";
import type { CorpusDocument, DocumentChunk } from "@/lib/types/gateway";
import { cn } from "@/lib/utils";

export default function DocumentDetailPage() {
  const params = useParams<{ id: string; docId: string }>();
  const collectionId = decodeURIComponent(params.id);
  const documentId = decodeURIComponent(params.docId);
  const [document, setDocument] = useState<CorpusDocument | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [reprocessing, setReprocessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const {
    items: pageChunks,
    meta,
    rowOffset,
    setPage,
    pageSize,
    setPageSize,
  } = useClientPagination(chunks, { pageSize: 10 });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [doc, chunkList] = await Promise.all([
        getDocument(collectionId, documentId),
        listDocumentChunks(collectionId, documentId),
      ]);
      setDocument(doc);
      setChunks(chunkList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load document");
      setDocument(null);
      setChunks([]);
    } finally {
      setLoading(false);
    }
  }, [collectionId, documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleReprocess() {
    if (!confirm("Reprocess this document from source file?")) return;
    setReprocessing(true);
    setError("");
    setSuccess("");
    try {
      await reprocessDocument(collectionId, documentId);
      setSuccess("Reprocess started — refresh in a few seconds.");
      setTimeout(() => void load(), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reprocess failed");
    } finally {
      setReprocessing(false);
    }
  }

  return (
    <AdminShell
      title={document?.file_name ? String(document.file_name) : `Document ${documentId}`}
      description="Chunk preview and reprocess for QA before publish."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void handleReprocess()} disabled={reprocessing}>
            <RotateCcw className="size-4" />
            {reprocessing ? "Reprocessing…" : "Reprocess"}
          </Button>
        </>
      }
      sidebarContent={<CollectionNav collectionId={collectionId} active="documents" />}
    >
      <Link
        href={`/collections/${encodeURIComponent(collectionId)}/documents`}
        className="mb-4 inline-block text-sm text-primary hover:underline"
      >
        ← Back to documents
      </Link>

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}
      {success ? <StatusBanner tone="success">{success}</StatusBanner> : null}

      {document ? (
        <div className="mb-6 grid gap-3 rounded-xl border border-border bg-card p-4 text-sm sm:grid-cols-4">
          <div><span className="text-muted-foreground">Status</span><p className="font-medium">{String(document.status ?? "—")}</p></div>
          <div><span className="text-muted-foreground">Chunks</span><p className="font-medium">{String(document.chunk_count ?? 0)}</p></div>
          <div><span className="text-muted-foreground">Tokens</span><p className="font-medium">{String(document.token_count ?? 0)}</p></div>
          <div><span className="text-muted-foreground">Progress</span><p className="font-medium">{Math.round((document.progress ?? 0) * 100)}%</p></div>
        </div>
      ) : null}

      <h2 className="mb-3 text-sm font-semibold">Chunks ({chunks.length})</h2>
      <div className="space-y-3">
        {loading ? (
          <StatusBanner tone="info">Loading chunks…</StatusBanner>
        ) : chunks.length === 0 ? (
          <StatusBanner tone="info">No chunks yet — document may still be indexing.</StatusBanner>
        ) : (
          pageChunks.map((chunk, index) => (
            <article key={String(chunk.id ?? rowOffset + index)} className="rounded-xl border border-border bg-card p-4 text-sm">
              <p className="mb-2 text-xs text-muted-foreground">
                STT {rowOffset + index + 1} · {String(chunk.id ?? "")}
              </p>
              <p className="whitespace-pre-wrap leading-relaxed">
                {String(chunk.content ?? chunk.text ?? "")}
              </p>
            </article>
          ))
        )}
      </div>

      {!loading && chunks.length > 0 ? (
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