"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, ShieldCheck, ShieldX } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Tên</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-muted-foreground" colSpan={4}>Loading users…</td></tr>
            ) : users.length === 0 ? (
              <tr><td className="px-4 py-6 text-muted-foreground" colSpan={4}>No users found.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.displayName ?? "—"}</td>
                  <td className="px-4 py-3">
                    {u.status === "banned" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-destructive">
                        <ShieldX className="size-3" /> Banned
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                        <ShieldCheck className="size-3" /> Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/users/${encodeURIComponent(u.id)}`} className="text-primary hover:underline">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
