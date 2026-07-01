"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Shield, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { useAdminMe } from "@/hooks/use-admin-me";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableRow, TableCell, TableEmpty, TableLoading } from "@/components/ui/table";
import { useT } from "@idx/i18n";

type Settings = {
  enabled: boolean;
  ips: string[];
  updatedAt: string | null;
  updatedBy: string | null;
};

export default function SecuritySettingsPage() {
  const t = useT();
  const { loading: meLoading, canManageIpAllowlist } = useAdminMe();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [clientIp, setClientIp] = useState("");
  const [publicIp, setPublicIp] = useState<string | null>(null);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [suggestedIp, setSuggestedIp] = useState("");
  const [manualIp, setManualIp] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    if (!canManageIpAllowlist) return;
    setLoading(true);
    setError("");
    try {
      const [settingsRes, ipRes] = await Promise.all([
        fetch("/api/settings/ip-allowlist"),
        fetch("/api/client-ip"),
      ]);

      if (!settingsRes.ok) {
        const data = await settingsRes.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : t("common.loadFailed"));
      }

      const settingsBody = await settingsRes.json() as { settings: Settings };
      setSettings(settingsBody.settings);

      if (ipRes.ok) {
        const ipBody = await ipRes.json() as {
          ip?: string;
          publicIp?: string | null;
          isLocalhost?: boolean;
          suggestedIp?: string;
        };
        setClientIp(ipBody.ip ?? "");
        setPublicIp(ipBody.publicIp ?? null);
        setIsLocalhost(Boolean(ipBody.isLocalhost));
        setSuggestedIp(ipBody.suggestedIp ?? ipBody.ip ?? "");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, [canManageIpAllowlist, t]);

  useEffect(() => {
    if (!meLoading && canManageIpAllowlist) void load();
    if (!meLoading && !canManageIpAllowlist) setLoading(false);
  }, [load, meLoading, canManageIpAllowlist]);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/settings/ip-allowlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : t("common.updateFailed"));
      }
      setSettings((data as { settings: Settings }).settings);
      setSuccess(t("security.saved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title={t("security.title")}
      description={t("security.description")}
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || saving}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh")}
        </Button>
      }
    >
      {!meLoading && !canManageIpAllowlist ? (
        <StatusBanner tone="error">{t("common.noAccess")}</StatusBanner>
      ) : null}

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}
      {success ? <StatusBanner tone="success">{success}</StatusBanner> : null}

      {canManageIpAllowlist ? <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">{t("security.status")}</h2>
              <div className="space-y-0.5 text-xs text-muted-foreground">
                <p>
                  {t("security.clientIp")}{" "}
                  <span className="font-mono text-foreground">{clientIp || "—"}</span>
                  {isLocalhost ? <span className="ml-1">{t("security.localhost")}</span> : null}
                </p>
                {publicIp ? (
                  <p>
                    {t("security.publicIp")}{" "}
                    <span className="font-mono text-foreground">{publicIp}</span>
                  </p>
                ) : null}
              </div>
            </div>
            <Badge tone={settings?.enabled ? "success" : "warning"}>
              {settings?.enabled ? t("common.enabled") : t("common.disabled")}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={saving || loading || !suggestedIp}
              onClick={() => void patch({ addIp: suggestedIp })}
            >
              <Plus className="size-4" />
              {publicIp ? t("security.addPublicIp") : t("security.addMyIp")}
            </Button>
            {isLocalhost && clientIp ? (
              <Button
                size="sm"
                variant="outline"
                disabled={saving || loading}
                onClick={() => void patch({ addIp: clientIp })}
              >
                {t("security.addLocalhost")}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant={settings?.enabled ? "destructive" : "default"}
              disabled={saving || loading || !settings}
              onClick={() => void patch({ enabled: !settings?.enabled })}
            >
              <Shield className="size-4" />
              {settings?.enabled ? t("security.disableAllowlist") : t("security.enableAllowlist")}
            </Button>
          </div>

          {!settings?.enabled ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {t("security.hint")}
            </p>
          ) : null}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">{t("security.manualAdd")}</h2>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!manualIp.trim()) return;
              void patch({ addIp: manualIp.trim() }).then(() => setManualIp(""));
            }}
          >
            <div className="min-w-[200px] flex-1">
              <Input
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value)}
                placeholder={t("security.manualPlaceholder")}
              />
            </div>
            <Button type="submit" size="sm" disabled={saving || !manualIp.trim()}>
              {t("common.add")}
            </Button>
          </form>
        </section>
      </div> : null}

      {canManageIpAllowlist ? <div className="mt-6">
        <Table headers={[t("security.colIndex"), t("security.colIp"), t("security.colActions")]}>
          {loading ? (
            <TableLoading colSpan={3} />
          ) : !settings || settings.ips.length === 0 ? (
            <TableEmpty colSpan={3} message={t("security.emptyIps")} />
          ) : (
            settings.ips.map((ip, index) => (
              <TableRow key={ip}>
                <TableCell className="w-12 text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-mono text-xs">{ip}</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={saving}
                    onClick={() => void patch({ removeIp: ip })}
                  >
                    <Trash2 className="size-3.5" />
                    {t("common.delete")}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </Table>
      </div> : null}
    </AdminShell>
  );
}