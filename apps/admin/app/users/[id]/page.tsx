"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Ban, CheckCircle, Key, LogOut, RefreshCw, Trash2, X } from "lucide-react";
import { useT } from "@idx/i18n";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";

type UserDetail = {
  user: { id: string; email: string; displayName: string | null; status: string; createdAt: string };
  roles: Array<{ id: number; name: string }>;
  permissions: string[];
};

export default function AdminUserDetailPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = decodeURIComponent(params.id);

  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [banning, setBanning] = useState(false);

  const [newPw, setNewPw] = useState("");
  const [resetting, setResetting] = useState(false);
  const [pwResult, setPwResult] = useState("");

  const [allRoles, setAllRoles] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const [forceLogging, setForceLogging] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(typeof d?.error?.message === "string" ? d.error.message : `HTTP ${res.status}`);
      }
      const body = await res.json() as any;
      setDetail(body ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void loadUser(); void loadRoles(); }, [loadUser]);

  async function loadRoles() {
    try {
      const res = await fetch("/api/admin/roles");
      if (res.ok) {
        const body = await res.json() as any;
        setAllRoles(body?.roles ?? []);
      }
    } catch { /* ignore */ }
  }

  async function toggleBan() {
    if (!detail) return;
    const newStatus = detail.user.status === "banned" ? "active" : "banned";
    const action = newStatus === "banned" ? t("users.ban") : t("users.unban");
    if (!confirm(t("users.banConfirm", { action, email: detail.user.email }))) return;
    setBanning(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/ban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(typeof d?.error?.message === "string" ? d.error.message : `HTTP ${res.status}`);
      }
      await loadUser();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ban failed");
    } finally {
      setBanning(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) { setPwResult(t("users.passwordMin8")); return; }
    setPwResult("");
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPw }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(typeof d?.error?.message === "string" ? d.error.message : `HTTP ${res.status}`);
      }
      setPwResult(t("users.passwordReset"));
      setNewPw("");
    } catch (e) {
      setPwResult(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  }

  async function assignRole() {
    if (!selectedRole) return;
    setAssigning(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleName: selectedRole }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(typeof d?.error?.message === "string" ? d.error.message : `HTTP ${res.status}`);
      }
      await loadUser();
      setSelectedRole("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assign role failed");
    } finally {
      setAssigning(false);
    }
  }

  async function revokeRole(roleName: string) {
    setRevoking(roleName);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/roles`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleName }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(typeof d?.error?.message === "string" ? d.error.message : `HTTP ${res.status}`);
      }
      await loadUser();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revoke role failed");
    } finally {
      setRevoking(null);
    }
  }

  async function forceLogout() {
    if (!confirm(t("users.forceLogoutConfirm", { email: detail?.user.email ?? "" }))) return;
    setForceLogging(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/force-logout`, {
        method: "POST",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(typeof d?.error?.message === "string" ? d.error.message : `HTTP ${res.status}`);
      }
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Force logout failed");
    } finally {
      setForceLogging(false);
    }
  }

  async function deleteUser() {
    if (!confirm(t("users.deleteConfirm", { email: detail?.user.email ?? "" }))) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(typeof d?.error?.message === "string" ? d.error.message : `HTTP ${res.status}`);
      }
      router.push("/users");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const u = detail?.user;

  return (
    <AdminShell
      title={u ? u.email : t("users.detailTitle")}
      description={t("users.detailDescription")}
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadUser()} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh")}
        </Button>
      }
    >
      <Link href="/users" className="mb-4 inline-block text-sm text-primary hover:underline">
        {t("common.backToUsers")}
      </Link>

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}

      {loading ? (
        <StatusBanner tone="info">{t("users.loadingUser")}</StatusBanner>
      ) : !detail ? (
        <StatusBanner tone="error">{t("users.notFound")}</StatusBanner>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <span className="text-muted-foreground">{t("common.email")}</span>
                <p className="font-medium">{detail.user.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("users.displayName")}</span>
                <p className="font-medium">{detail.user.displayName ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("common.status")}</span>
                <p className={`font-medium ${detail.user.status === "banned" ? "text-destructive" : "text-emerald-700"}`}>
                  {detail.user.status === "banned" ? t("common.banned") : detail.user.status === "active" ? t("common.active") : detail.user.status}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-medium mb-2">{t("users.roles")}</h2>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {detail.roles.length === 0 ? (
                <span className="text-xs text-muted-foreground">{t("users.noRoles")}</span>
              ) : (
                detail.roles.map((r) => (
                  <span key={r.id} className="inline-flex items-center gap-1 rounded bg-muted/50 px-2 py-0.5 text-xs font-mono">
                    {r.name}
                    <button
                      type="button"
                      onClick={() => void revokeRole(r.name)}
                      disabled={revoking === r.name}
                      className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs h-8"
              >
                <option value="">{t("users.selectRole")}</option>
                {allRoles
                  .filter((r) => !detail.roles.some((ur) => ur.id === r.id))
                  .map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void assignRole()}
                disabled={assigning || !selectedRole}
              >
                {assigning ? t("common.saving") : t("users.assign")}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-medium mb-3">{t("users.actions")}</h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => void toggleBan()} disabled={banning}>
                {detail.user.status === "banned" ? <CheckCircle className="size-3.5" /> : <Ban className="size-3.5" />}
                {banning ? t("common.saving") : detail.user.status === "banned" ? t("users.unban") : t("users.ban")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => void forceLogout()} disabled={forceLogging}>
                <LogOut className="size-3.5" />
                {forceLogging ? t("common.saving") : t("users.forceLogout")}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => void deleteUser()} disabled={deleting}>
                <Trash2 className="size-3.5" />
                {deleting ? t("common.saving") : t("common.delete")}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-medium mb-2">{t("users.resetPassword")}</h2>
            <form onSubmit={(e) => void handleResetPassword(e)} className="flex items-center gap-2">
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder={t("users.newPasswordPlaceholder")}
                minLength={8}
                className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs h-8"
              />
              <Button type="submit" variant="secondary" size="sm" disabled={resetting || newPw.length < 8}>
                <Key className="size-3.5" />
                {resetting ? t("common.saving") : t("users.reset")}
              </Button>
            </form>
            {pwResult ? <p className="mt-1 text-xs text-muted-foreground">{pwResult}</p> : null}
          </div>

          <details className="rounded-xl border border-border bg-card p-4 text-sm">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              {t("users.permissions", { count: detail.permissions.length })}
            </summary>
            <div className="mt-2 flex flex-wrap gap-1">
              {detail.permissions.map((p) => (
                <span key={p} className="inline-flex items-center rounded bg-muted/30 px-1.5 py-0.5 text-xs font-mono">
                  {p}
                </span>
              ))}
            </div>
          </details>
        </div>
      )}
    </AdminShell>
  );
}