"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { RefreshCw, Trash2, Upload } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { CollectionNav } from "@/components/collection-nav";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteFile,
  indexStatusForFile,
  listDocuments,
  listFiles,
  uploadDocumentPipeline,
} from "@/lib/api/collections";
import type { CorpusDocument, CorpusFile } from "@/lib/types/gateway";
import { cn } from "@/lib/utils";

export default function FilesPage() {
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
      setError(e instanceof Error ? e.message : "Failed to load files");
      setFiles([]);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

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
      setError("Choose a file to upload.");
      return;
    }

    const allowed = [".docx", ".pdf", ".xlsx", ".csv"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowed.includes(ext)) {
      setError(`Unsupported file type "${ext}". Allowed: ${allowed.join(", ")}`);
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const doc = await uploadDocumentPipeline(collectionId, file);
      setSuccess(`Uploaded ${file.name} — status: ${String(doc.status ?? "PENDING")}, indexing in progress.`);
      form.reset();
      setAutoRefresh(true);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(fileId: string, filename: string) {
    if (!confirm(`Delete file "${filename}"?`)) return;
    setDeletingId(fileId);
    setError("");
    try {
      await deleteFile(collectionId, fileId);
      setSuccess(`Deleted ${filename}`);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AdminShell
      title={`Collection ${collectionId}`}
      description="Upload source files. Status refreshes every 5s while indexing."
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadAll()} disabled={loading}>
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Refresh
        </Button>
      }
      sidebarContent={<CollectionNav collectionId={collectionId} active="files" />}
    >

      <form
        onSubmit={(e) => void handleUpload(e)}
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-sm font-medium">Upload file <span className="text-muted-foreground font-normal">(.docx, .pdf, .xlsx, .csv)</span></label>
          <Input name="file" type="file" required accept=".docx,.pdf,.xlsx,.csv" />
        </div>
        <Button type="submit" disabled={uploading}>
          <Upload className="size-4" />
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </form>

      {autoRefresh ? <StatusBanner tone="info">Auto-refreshing while files are indexing…</StatusBanner> : null}
      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}
      {success ? <StatusBanner tone="success">{success}</StatusBanner> : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Filename</th>
              <th className="px-4 py-3 font-medium">Index status</th>
              <th className="px-4 py-3 font-medium">Size</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-muted-foreground" colSpan={4}>Loading files…</td></tr>
            ) : files.length === 0 ? (
              <tr><td className="px-4 py-6 text-muted-foreground" colSpan={4}>No files yet — upload above.</td></tr>
            ) : (
              files.map((file, index) => {
                const fileId = String(file.id ?? index);
                const status = indexStatusForFile(fileId, documents);
                return (
                  <tr key={fileId} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3">{String(file.filename ?? file.name ?? "—")}</td>
                    <td className={cn(
                      "px-4 py-3",
                      status.tone === "ready" && "text-emerald-700",
                      status.tone === "error" && "text-destructive",
                      status.tone === "indexing" && "text-amber-700",
                      status.tone === "pending" && "text-muted-foreground",
                    )}>
                      {status.label}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {file.size_bytes ? `${Math.round(Number(file.size_bytes) / 1024)} KB` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleDelete(fileId, String(file.filename ?? "file"))}
                        disabled={deletingId === fileId}
                      >
                        <Trash2 className="size-3.5" />
                        {deletingId === fileId ? "…" : "Delete"}
                      </Button>
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