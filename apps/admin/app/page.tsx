"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { CreateCollectionForm } from "@/components/create-collection-form";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { PaginationBar } from "@/components/ui/pagination";
import { Table, TableRow, TableCell, TableEmpty, TableLoading } from "@/components/ui/table";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { listCollections } from "@/lib/api/collections";
import type { Collection } from "@/lib/types/gateway";
import { useT } from "@idx/i18n";

export default function AdminHome() {
  const t = useT();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const {
    items: pageCollections,
    meta,
    rowOffset,
    setPage,
    pageSize,
    setPageSize,
  } = useClientPagination(collections);

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
      title={t("collections.title")}
      description={t("collections.description")}
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadCollections()} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh")}
        </Button>
      }
    >
      <div className="mb-6">
        <CreateCollectionForm onCreated={() => void loadCollections()} />
      </div>

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}

      <Table
        headers={[t("common.colIndex"), t("collections.colId"), t("collections.colName"), t("collections.colChunkSize"), t("common.colActions")]}
        footer={
          !loading && collections.length > 0 ? (
            <PaginationBar
              meta={meta}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          ) : null
        }
      >
        {loading ? (
          <TableLoading colSpan={5} message={t("collections.loading")} />
        ) : collections.length === 0 ? (
          <TableEmpty colSpan={5} message={t("collections.empty")} />
        ) : (
          pageCollections.map((collection, index) => {
            const id = String(collection.id ?? index);
            return (
              <TableRow key={id}>
                <TableCell className="w-12 text-muted-foreground">{rowOffset + index + 1}</TableCell>
                <TableCell className="font-mono text-xs">{id}</TableCell>
                <TableCell>{String(collection.name ?? "—")}</TableCell>
                <TableCell className="text-muted-foreground">
                  {String(collection.parser_config?.chunk_size ?? "—")}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/collections/${encodeURIComponent(id)}/files`} className="text-primary hover:underline">{t("common.upload")}</Link>
                    <Link href={`/collections/${encodeURIComponent(id)}/documents`} className="text-primary hover:underline">{t("collections.review")}</Link>
                    <Link href={`/collections/${encodeURIComponent(id)}/settings`} className="text-primary hover:underline">{t("collections.settings")}</Link>
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