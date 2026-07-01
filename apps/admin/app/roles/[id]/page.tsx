"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PermissionInfo = { id: number; code: string; name: string; resource: string; action: string };
type RoleInfo = { id: number; name: string; description: string };

export default function RoleDetailPage() {
  const params = useParams<{ id: string }>();
  const roleId = Number(decodeURIComponent(params.id));

  const [role, setRole] = useState<RoleInfo | null>(null);
  const [allPermissions, setAllPermissions] = useState<PermissionInfo[]>([]);
  const [rolePerms, setRolePerms] = useState<PermissionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [rRes, pRes, rpRes] = await Promise.all([
        fetch("/api/admin/roles"),
        fetch("/api/admin/permissions"),
        fetch(`/api/admin/roles/${roleId}/permissions`),
      ]);
      const roles = ((await rRes.json() as any)?.roles ?? []);
      setRole(roles.find((r: RoleInfo) => r.id === roleId) ?? null);
      setAllPermissions((await pRes.json() as any)?.permissions ?? []);
      setRolePerms((await rpRes.json() as any)?.permissions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally { setLoading(false); }
  }, [roleId]);

  useEffect(() => { void load(); }, [load]);

  async function togglePermission(permId: number, has: boolean) {
    setToggling(permId);
    setError("");
    try {
      const res = await fetch(`/api/admin/roles/${roleId}/permissions`, {
        method: has ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionId: permId }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.error?.message ?? `HTTP ${res.status}`); }
      setRolePerms((prev) => has ? prev.filter((p) => p.id !== permId) : [...prev, allPermissions.find((p) => p.id === permId)!]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Toggle failed");
    } finally { setToggling(null); }
  }

  const rolePermIds = new Set(rolePerms.map((p) => p.id));

  // Group by resource
  const grouped: Record<string, PermissionInfo[]> = {};
  for (const p of allPermissions) {
    (grouped[p.resource] ??= []).push(p);
  }

  return (
    <AdminShell
      title={role?.name ?? "Role"}
      description="Manage permissions for this role."
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn("size-4", loading && "animate-spin")} /> Refresh
        </Button>
      }
    >
      <Link href="/roles" className="mb-4 inline-block text-sm text-primary hover:underline">
        ← Back to roles
      </Link>

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}
      {role ? <p className="mb-4 text-xs text-muted-foreground">{role.description}</p> : null}

      {loading ? (
        <StatusBanner tone="info">Loading…</StatusBanner>
      ) : !role ? (
        <StatusBanner tone="error">Role not found.</StatusBanner>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([resource, perms]) => (
            <div key={resource} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-4 py-2">
                <span className="text-xs font-medium uppercase text-muted-foreground">{resource}</span>
              </div>
              <div className="divide-y divide-border/70">
                {perms.map((p) => {
                  const has = rolePermIds.has(p.id);
                  return (
                    <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div>
                        <span className="font-mono text-xs">{p.code}</span>
                        <span className="ml-2 text-muted-foreground">{p.name}</span>
                      </div>
                      <button
                        type="button"
                        disabled={toggling === p.id}
                        onClick={() => void togglePermission(p.id, has)}
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:opacity-50",
                          has ? "bg-primary" : "bg-input",
                        )}
                      >
                        <span className={cn(
                          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform",
                          has ? "translate-x-4" : "translate-x-0",
                        )} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
