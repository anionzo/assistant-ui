"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Upload } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { CollectionNav } from "@/components/collection-nav";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { asArray, bffJson } from "@/lib/api/bff";
import type { CorpusFile } from "@/lib/types/gateway";

export default function FilesPage() {
  const params = useParams<{ id: string }>();
  const collectionId = decodeURIComponent(params.id);
  const [files, setFiles] = useState<CorpusFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await bffJson<unknown>(
        `/api/documents/collections/${encodeURIComponent(collectionId)}/files`,
      );
      setFiles(asArray<CorpusFile>(payload, ["files", "items", "data"]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const body = new FormData();
      body.append("file", file);
      await bffJson(
        `/api/documents/collections/${encodeURIComponent(collectionId)}/files`,
        { method: "POST", body },
      );
      setSuccess(`Uploaded ${file.name}`);
      form.reset();
      await loadFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <AdminShell
      title={`Collection ${collectionId}`}
      description="Upload source files for indexing."
    >
      <CollectionNav collectionId={collectionId} active="files" />

      <form
        onSubmit={(e) => void handleUpload(e)}
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-sm font-medium">Upload file</label>
          <Input name="file" type="file" required />
        </div>
        <Button type="submit" disabled={uploading}>
          <Upload className="size-4" />
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </form>

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}
      {success ? <StatusBanner tone="success">{success}</StatusBanner> : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Filename</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">ID</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={3}>
                  Loading files…
                </td>
              </tr>
            ) : files.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={3}>
                  No files in this collection yet.
                </td>
              </tr>
            ) : (
              files.map((file, index) => (
                <tr key={String(file.id ?? index)} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3">{String(file.filename ?? file.name ?? "—")}</td>
                  <td className="px-4 py-3 text-muted-foreground">{String(file.status ?? "—")}</td>
                  <td className="px-4 py-3 font-mono text-xs">{String(file.id ?? "—")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}