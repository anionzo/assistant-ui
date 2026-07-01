"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { RefreshCw, Trash2, Upload } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { CollectionNav } from "@/components/collection-nav";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination";
import { Table, TableRow, TableCell, TableEmpty, TableLoading } from "@/components/ui/table";
import { useClientPagination } from "@/hooks/use-client-pagination";
import {
  deleteFile,
  indexStatusForFile,
  listDocuments,
  listFiles,
  uploadDocumentPipeline,
} from "@/lib/api/collections";
import type { CorpusDocument, CorpusFile } from "@/lib/types/gateway";
import { cn } from "@/lib/utils";
import { useT } from "@idx/i18n";

const ALLOWED_EXTENSIONS = [".docx", ".pdf", ".xlsx", ".csv"];

function indexStatusLabel(t: ReturnType<typeof useT>, fileId: string, documents: CorpusDocument[]) {
  const doc = documents.find((d) => d.file_id === fileId);
  if (!doc) return t("collections.statusPending");
  if (doc.error) return t("collections.statusError", { error: doc.error });
  if (doc.status === "READY" || (doc.progress ?? 0) >= 1) {
    return t("collections.statusReady", { count: doc.chunk_count ?? 0 });
  }
  const pct = Math.round((doc.progress ?? 0) * 100);
  return t("collections.statusIndexing", { status: doc.status ?? "Indexing", pct });
}

export default function FilesPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const collectionId = decodeURIComponent(params.id);
  const [files, setFiles] = useState<CorpusFile[]>([]);
  const [documents, setDocuments] = useState<CorpusDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const {
    items: pageFiles,
    meta,
    rowOffset,
    setPage,
    pageSize,
    setPageSize,
  } = useClientPagination(files);

  const loadAll = useCallback(async () => {
    setError("");
    try {
      const [fileList, docList] = await Promise.all([
        listFiles(collectionId),
        listDocuments(collectionId),
      ]);
      setFiles(fileList);
      setDocuments(docList);
      const pending = fileList.some((f) => {
        const s = indexStatusForFile(String(f.id), docList);
        return s.tone === "pending" || s.tone === "indexing";
      });
      setAutoRefresh(pending);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("collections.loadFilesFailed"));
      setFiles([]);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [collectionId, t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => void loadAll(), 5000);
    return () => clearInterval(timer);
  }, [autoRefresh, loadAll]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) {
      setError(t("collections.chooseFile"));
      return;
    }

    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(t("collections.unsupportedFileType", { ext, allowed: ALLOWED_EXTENSIONS.join(", ") }));
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const doc = await uploadDocumentPipeline(collectionId, file);
      setSuccess(
        t("collections.uploadSuccess", {
          filename: file.name,
          status: String(doc.status ?? "PENDING"),
        }),
      );
      form.reset();
      setAutoRefresh(true);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("collections.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(fileId: string, filename: string) {
    if (!confirm(t("collections.deleteFileConfirm", { filename }))) return;
    setDeletingId(fileId);
    setError("");
    try {
      await deleteFile(collectionId, fileId);
      setSuccess(t("collections.deleteSuccess", { filename }));
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("collections.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AdminShell
      title={t("collections.collectionTitle", { id: collectionId })}
      description={t("collections.filesDescription")}
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadAll()} disabled={loading}>
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          {t("common.refresh")}
        </Button>
      }
      sidebarContent={<CollectionNav collectionId={collectionId} active="files" />}
    >
      <form
        onSubmit={(e) => void handleUpload(e)}
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-sm font-medium">
            {t("collections.uploadFileLabel")}{" "}
            <span className="font-normal text-muted-foreground">{t("collections.uploadFileTypes")}</span>
          </label>
          <Input name="file" type="file" required accept=".docx,.pdf,.xlsx,.csv" />
        </div>
        <Button type="submit" disabled={uploading}>
          <Upload className="size-4" />
          {uploading ? t("common.uploading") : t("common.upload")}
        </Button>
      </form>

      {autoRefresh ? <StatusBanner tone="info">{t("collections.autoRefresh")}</StatusBanner> : null}
      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}
      {success ? <StatusBanner tone="success">{success}</StatusBanner> : null}

      <Table
        headers={[
          t("common.colIndex"),
          t("collections.colFilename"),
          t("collections.colIndexStatus"),
          t("collections.colSize"),
          t("common.colActions"),
        ]}
        footer={
          !loading && files.length > 0 ? (
            <PaginationBar meta={meta} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
          ) : null
        }
      >
        {loading ? (
          <TableLoading colSpan={5} message={t("collections.loadingFiles")} />
        ) : files.length === 0 ? (
          <TableEmpty colSpan={5} message={t("collections.filesEmpty")} />
        ) : (
          pageFiles.map((file, index) => {
            const fileId = String(file.id ?? index);
            const status = indexStatusForFile(fileId, documents);
            return (
              <TableRow key={fileId}>
                <TableCell className="w-12 text-muted-foreground">{rowOffset + index + 1}</TableCell>
                <TableCell>{String(file.filename ?? file.name ?? "—")}</TableCell>
                <TableCell
                  className={cn(
                    status.tone === "ready" && "text-emerald-700",
                    status.tone === "error" && "text-destructive",
                    status.tone === "indexing" && "text-amber-700",
                    status.tone === "pending" && "text-muted-foreground",
                  )}
                >
                  {indexStatusLabel(t, fileId, documents)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {file.size_bytes ? `${Math.round(Number(file.size_bytes) / 1024)} KB` : "—"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void handleDelete(fileId, String(file.filename ?? "file"))}
                    disabled={deletingId === fileId}
                  >
                    <Trash2 className="size-3.5" />
                    {deletingId === fileId ? "…" : t("common.delete")}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </Table>
    </AdminShell>
  );
}