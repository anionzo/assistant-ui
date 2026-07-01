"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Table, TableRow, TableCell, TableEmpty, TableLoading } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type UserRow = {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(typeof d?.error === "string" ? d.error : `HTTP ${res.status}`);
      }
      const body = await res.json() as any;
      setUsers(body?.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  return (
    <AdminShell
      title="Users"
      description="Manage registered user accounts."
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadUsers()} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}

      <Table headers={["Email", "Display name", "Status", "Actions"]}>
        {loading ? (
          <TableLoading colSpan={4} />
        ) : users.length === 0 ? (
          <TableEmpty colSpan={4} message="No users found." />
        ) : (
          users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.email}</TableCell>
              <TableCell className="text-muted-foreground">{u.displayName ?? "—"}</TableCell>
              <TableCell>
                <Badge tone={u.status === "banned" ? "error" : "success"}>
                  {u.status === "banned" ? "Banned" : "Active"}
                </Badge>
              </TableCell>
              <TableCell>
                <Link href={`/users/${encodeURIComponent(u.id)}`} className="text-primary hover:underline text-sm">
                  Manage
                </Link>
              </TableCell>
            </TableRow>
          ))
        )}
      </Table>
    </AdminShell>
  );
}
