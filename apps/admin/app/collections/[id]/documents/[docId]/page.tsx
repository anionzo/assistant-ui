"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RefreshCw, RotateCcw } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { ChunkDetailCard } from "@/components/chunk-detail-card";
import { CollectionNav } from "@/components/collection-nav";
import { RecordFieldsPanel } from "@/components/record-fields-panel";
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
import { useT } from "@idx/i18n";

export default function DocumentDetailPage() {
  const t = useT();
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
      setError(e instanceof Error ? e.message : t("collections.loadDocumentFailed"));
      setDocument(null);
      setChunks([]);
    } finally {
      setLoading(false);
    }
  }, [collectionId, documentId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleReprocess() {
    if (!confirm(t("collections.reprocessConfirm"))) return;
    setReprocessing(true);
    setError("");
    setSuccess("");
    try {
      await reprocessDocument(collectionId, documentId);
      setSuccess(t("collections.reprocessStarted"));
      setTimeout(() => void load(), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("collections.reprocessFailed"));
    } finally {
      setReprocessing(false);
    }
  }

  return (
    <AdminShell
      title={
        document?.file_name
          ? String(document.file_name)
          : t("collections.documentTitle", { id: documentId })
      }
      description={t("collections.chunkPreview")}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            {t("common.refresh")}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void handleReprocess()} disabled={reprocessing}>
            <RotateCcw className="size-4" />
            {reprocessing ? t("collections.reprocessing") : t("collections.reprocess")}
          </Button>
        </>
      }
      sidebarContent={<CollectionNav collectionId={collectionId} active="documents" />}
    >
      <Link
        href={`/collections/${encodeURIComponent(collectionId)}/documents`}
        className="mb-4 inline-block text-sm text-primary hover:underline"
      >
        {t("common.backToDocuments")}
      </Link>

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}
      {success ? <StatusBanner tone="success">{success}</StatusBanner> : null}

      {document ? (
        <RecordFieldsPanel
          className="mb-6"
          title={t("collections.documentDetails")}
          record={document as Record<string, unknown>}
        />
      ) : null}

      <h2 className="mb-3 text-sm font-semibold">{t("collections.chunksTitle", { count: chunks.length })}</h2>
      <div className="space-y-3">
        {loading ? (
          <StatusBanner tone="info">{t("collections.loadingChunks")}</StatusBanner>
        ) : chunks.length === 0 ? (
          <StatusBanner tone="info">{t("collections.chunksEmpty")}</StatusBanner>
        ) : (
          pageChunks.map((chunk, index) => (
            <ChunkDetailCard
              key={String(chunk.id ?? rowOffset + index)}
              index={rowOffset + index + 1}
              record={chunk as Record<string, unknown>}
            />
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