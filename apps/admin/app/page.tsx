"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { CreateCollectionForm } from "@/components/create-collection-form";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { listCollections } from "@/lib/api/collections";
import type { Collection } from "@/lib/types/gateway";

export default function AdminHome() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCollections = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCollections(await listCollections());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load collections");
      setCollections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  return (
    <AdminShell
      title="Collections"
      description="Create corpus, upload files, verify chunks, then publish to chat."
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadCollections()} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      <div className="mb-6">
        <CreateCollectionForm onCreated={() => void loadCollections()} />
      </div>

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Chunk size</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={4}>Loading collections…</td>
              </tr>
            ) : collections.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                  No collections yet — create one above.
                </td>
              </tr>
            ) : (
              collections.map((collection, index) => {
                const id = String(collection.id ?? index);
                return (
                  <tr key={id} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{id}</td>
                    <td className="px-4 py-3">{String(collection.name ?? "—")}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {String(collection.parser_config?.chunk_size ?? "—")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/collections/${encodeURIComponent(id)}/files`} className="text-primary hover:underline">Files</Link>
                        <Link href={`/collections/${encodeURIComponent(id)}/documents`} className="text-primary hover:underline">Documents</Link>
                        <Link href={`/collections/${encodeURIComponent(id)}/settings`} className="text-primary hover:underline">Settings</Link>
                      </div>
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