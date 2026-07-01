"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Shield } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RoleRow = { id: number; name: string; description: string };

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.error?.message ?? `HTTP ${res.status}`); }
      const body = await res.json() as any;
      setRoles(body?.data?.roles ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load roles");
      setRoles([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadRoles(); }, [loadRoles]);

  return (
    <AdminShell
      title="Roles"
      description="Manage permission roles and their access rights."
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadRoles()} disabled={loading}>
          <RefreshCw className={cn("size-4", loading && "animate-spin")} /> Refresh
        </Button>
      }
    >
      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full text-sm text-muted-foreground">Loading roles…</div>
        ) : roles.map((r) => (
          <Link
            key={r.id}
            href={`/roles/${r.id}`}
            className="block rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">{r.name}</span>
            </div>
            {r.description ? (
              <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
