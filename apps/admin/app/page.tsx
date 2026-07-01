"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { CreateCollectionForm } from "@/components/create-collection-form";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Table, TableRow, TableCell, TableEmpty, TableLoading } from "@/components/ui/table";
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

      <Table headers={["ID", "Name", "Chunk size", "Actions"]}>
        {loading ? (
          <TableLoading colSpan={4} message="Loading collections…" />
        ) : collections.length === 0 ? (
          <TableEmpty colSpan={4} message="No collections yet — create one above." />
        ) : (
          collections.map((collection, index) => {
            const id = String(collection.id ?? index);
            return (
              <TableRow key={id}>
                <TableCell className="font-mono text-xs">{id}</TableCell>
                <TableCell>{String(collection.name ?? "—")}</TableCell>
                <TableCell className="text-muted-foreground">
                  {String(collection.parser_config?.chunk_size ?? "—")}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/collections/${encodeURIComponent(id)}/files`} className="text-primary hover:underline">Upload</Link>
                    <Link href={`/collections/${encodeURIComponent(id)}/documents`} className="text-primary hover:underline">Review</Link>
                    <Link href={`/collections/${encodeURIComponent(id)}/settings`} className="text-primary hover:underline">Settings</Link>
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </Table>
    </AdminShell>
  );
}
