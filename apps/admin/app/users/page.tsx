"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination";
import { Table, TableRow, TableCell, TableEmpty, TableLoading } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { PaginationMeta } from "@/lib/pagination";
import { useT } from "@idx/i18n";

type UserRow = {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
};

const DEFAULT_META: PaginationMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

export default function AdminUsersPage() {
  const t = useT();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_META);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (query.trim()) params.set("q", query.trim());

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(typeof d?.error === "string" ? d.error : `HTTP ${res.status}`);
      }
      const body = await res.json() as { users?: UserRow[]; pagination?: PaginationMeta };
      setUsers(body?.users ?? []);
      setPagination(body?.pagination ?? DEFAULT_META);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.loadFailed"));
      setUsers([]);
      setPagination(DEFAULT_META);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, query, t]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setQuery(search.trim());
  }

  const rowOffset = (pagination.page - 1) * pagination.limit;

  return (
    <AdminShell
      title={t("users.title")}
      description={t("users.description")}
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadUsers()} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh")}
        </Button>
      }
    >
      <form
        onSubmit={handleSearch}
        className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3"
      >
        <Search className="size-4 text-muted-foreground shrink-0" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("users.searchPlaceholder")}
          className="max-w-sm"
        />
        <Button type="submit" variant="secondary" size="sm">
          {t("common.search")}
        </Button>
      </form>

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}

      <Table
        headers={[
          t("common.colIndex"),
          t("common.email"),
          t("users.colDisplayName"),
          t("common.status"),
          t("common.colActions"),
        ]}
        footer={
          <PaginationBar
            meta={pagination}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        }
      >
        {loading ? (
          <TableLoading colSpan={5} />
        ) : users.length === 0 ? (
          <TableEmpty colSpan={5} message={t("users.empty")} />
        ) : (
          users.map((u, index) => (
            <TableRow key={u.id}>
              <TableCell className="w-12 text-muted-foreground">{rowOffset + index + 1}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell className="text-muted-foreground">{u.displayName ?? "—"}</TableCell>
              <TableCell>
                <Badge tone={u.status === "banned" ? "error" : "success"}>
                  {u.status === "banned" ? t("common.banned") : t("common.active")}
                </Badge>
              </TableCell>
              <TableCell>
                <Link href={`/users/${encodeURIComponent(u.id)}`} className="text-primary hover:underline text-sm">
                  {t("common.manage")}
                </Link>
              </TableCell>
            </TableRow>
          ))
        )}
      </Table>
    </AdminShell>
  );
}