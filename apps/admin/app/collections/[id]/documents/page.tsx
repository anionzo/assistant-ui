"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { CollectionNav } from "@/components/collection-nav";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination";
import { Table, TableRow, TableCell, TableEmpty, TableLoading } from "@/components/ui/table";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { listDocuments, publishCollection } from "@/lib/api/collections";
import type { CorpusDocument } from "@/lib/types/gateway";
import { cn } from "@/lib/utils";
import { useT } from "@idx/i18n";

export default function DocumentsPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const collectionId = decodeURIComponent(params.id);
  const [documents, setDocuments] = useState<CorpusDocument[]>([]);
  const [corpusId, setCorpusId] = useState("admission-chatbot-corpus");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const {
    items: pageDocuments,
    meta,
    rowOffset,
    setPage,
    pageSize,
    setPageSize,
  } = useClientPagination(documents);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDocuments(await listDocuments(collectionId));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("collections.loadDocumentsFailed"));
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [collectionId, t]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function publishCorpus() {
    setPublishing(true);
    setError("");
    setSuccess("");
    try {
      const result = await publishCollection(collectionId, corpusId.trim());
      setSuccess(
        t("collections.publishSuccess", {
          corpusId,
          status: String((result as { status?: string }).status ?? "ok"),
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("collections.publishFailed"));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <AdminShell
      title={t("collections.collectionTitle", { id: collectionId })}
      description={t("collections.documentsDescription")}
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadDocuments()} disabled={loading}>
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          {t("common.refresh")}
        </Button>
      }
      sidebarContent={<CollectionNav collectionId={collectionId} active="documents" />}
    >
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-sm font-medium">{t("collections.publishCorpus")}</label>
          <Input value={corpusId} onChange={(e) => setCorpusId(e.target.value)} />
        </div>
        <Button onClick={() => void publishCorpus()} disabled={publishing}>
          {publishing ? t("collections.publishing") : t("collections.publishToChat")}
        </Button>
      </div>

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}
      {success ? <StatusBanner tone="success">{success}</StatusBanner> : null}

      <Table
        headers={[
          t("common.colIndex"),
          t("collections.colFile"),
          t("common.status"),
          t("collections.colChunks"),
          t("common.colActions"),
        ]}
        footer={
          !loading && documents.length > 0 ? (
            <PaginationBar meta={meta} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          ) : null
        }
      >
        {loading ? (
          <TableLoading colSpan={5} />
        ) : documents.length === 0 ? (
          <TableEmpty colSpan={5} message={t("collections.documentsEmpty")} />
        ) : (
          pageDocuments.map((doc, index) => {
            const docId = String(doc.id ?? index);
            return (
              <TableRow key={docId}>
                <TableCell className="w-12 text-muted-foreground">{rowOffset + index + 1}</TableCell>
                <TableCell>{String(doc.file_name ?? doc.title ?? "—")}</TableCell>
                <TableCell
                  className={cn(
                    doc.status === "READY" ? "text-emerald-700" : doc.error ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {doc.error ? t("collections.documentError", { error: doc.error }) : String(doc.status ?? "—")}
                </TableCell>
                <TableCell className="text-muted-foreground">{String(doc.chunk_count ?? 0)}</TableCell>
                <TableCell>
                  <Link
                    href={`/collections/${encodeURIComponent(collectionId)}/documents/${encodeURIComponent(docId)}`}
                    className="text-primary hover:underline"
                  >
                    {t("collections.viewChunks")}
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