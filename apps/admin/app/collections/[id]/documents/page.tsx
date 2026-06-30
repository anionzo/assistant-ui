"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { CollectionNav } from "@/components/collection-nav";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { asArray, bffJson } from "@/lib/api/bff";
import type { CorpusDocument } from "@/lib/types/gateway";

export default function DocumentsPage() {
  const params = useParams<{ id: string }>();
  const collectionId = decodeURIComponent(params.id);
  const [documents, setDocuments] = useState<CorpusDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await bffJson<unknown>(
        `/api/documents/collections/${encodeURIComponent(collectionId)}/documents`,
      );
      setDocuments(asArray<CorpusDocument>(payload, ["documents", "items", "data"]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function publishCorpus() {
    setPublishing(true);
    setError("");
    setSuccess("");
    try {
      await bffJson(
        `/api/documents/collections/${encodeURIComponent(collectionId)}/publish`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      );
      setSuccess("Publish request sent to gateway.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <AdminShell
      title={`Collection ${collectionId}`}
      description="Indexed documents and publish-to-chat action."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => void loadDocuments()} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => void publishCorpus()} disabled={publishing}>
            {publishing ? "Publishing…" : "Publish corpus"}
          </Button>
        </>
      }
    >
      <CollectionNav collectionId={collectionId} active="documents" />

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}
      {success ? <StatusBanner tone="success">{success}</StatusBanner> : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">ID</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={3}>
                  Loading documents…
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={3}>
                  No documents indexed for this collection.
                </td>
              </tr>
            ) : (
              documents.map((doc, index) => (
                <tr key={String(doc.id ?? index)} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3">{String(doc.title ?? doc.name ?? "—")}</td>
                  <td className="px-4 py-3 text-muted-foreground">{String(doc.source ?? "—")}</td>
                  <td className="px-4 py-3 font-mono text-xs">{String(doc.id ?? "—")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}