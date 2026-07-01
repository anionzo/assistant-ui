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

type Settings = {
  enabled: boolean;
  ips: string[];
  updatedAt: string | null;
  updatedBy: string | null;
};

export default function SecuritySettingsPage() {
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
        throw new Error(typeof data.error === "string" ? data.error : "Không tải được cấu hình");
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
  }, [canManageIpAllowlist]);

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
        throw new Error(typeof data.error === "string" ? data.error : "Cập nhật thất bại");
      }
      setSettings((data as { settings: Settings }).settings);
      setSuccess("Đã lưu cấu hình IP allowlist.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Bảo mật IP"
      description="Mặc định tắt. Bật sau khi đã thêm IP của bạn — tránh tự khóa khỏi admin."
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || saving}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      {!meLoading && !canManageIpAllowlist ? (
        <StatusBanner tone="error">Bạn không có quyền xem trang này.</StatusBanner>
      ) : null}

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}
      {success ? <StatusBanner tone="success">{success}</StatusBanner> : null}

      {canManageIpAllowlist ? <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Trạng thái</h2>
              <div className="space-y-0.5 text-xs text-muted-foreground">
                <p>
                  IP kết nối:{" "}
                  <span className="font-mono text-foreground">{clientIp || "—"}</span>
                  {isLocalhost ? <span className="ml-1">(localhost)</span> : null}
                </p>
                {publicIp ? (
                  <p>
                    IP công khai:{" "}
                    <span className="font-mono text-foreground">{publicIp}</span>
                  </p>
                ) : null}
              </div>
            </div>
            <Badge tone={settings?.enabled ? "success" : "warning"}>
              {settings?.enabled ? "Đang bật" : "Đang tắt"}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={saving || loading || !suggestedIp}
              onClick={() => void patch({ addIp: suggestedIp })}
            >
              <Plus className="size-4" />
              {publicIp ? "Thêm IP công khai" : "Thêm IP của tôi"}
            </Button>
            {isLocalhost && clientIp ? (
              <Button
                size="sm"
                variant="outline"
                disabled={saving || loading}
                onClick={() => void patch({ addIp: clientIp })}
              >
                Thêm localhost
              </Button>
            ) : null}
            <Button
              size="sm"
              variant={settings?.enabled ? "destructive" : "default"}
              disabled={saving || loading || !settings}
              onClick={() => void patch({ enabled: !settings?.enabled })}
            >
              <Shield className="size-4" />
              {settings?.enabled ? "Tắt bắt IP" : "Bật bắt IP"}
            </Button>
          </div>

          {!settings?.enabled ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Bước 1: Thêm IP của bạn · Bước 2: Bật allowlist. CIDR hỗ trợ, ví dụ <code>10.0.0.0/8</code>.
            </p>
          ) : null}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Thêm IP thủ công</h2>
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
                placeholder="203.0.113.10 hoặc 10.0.0.0/8"
              />
            </div>
            <Button type="submit" size="sm" disabled={saving || !manualIp.trim()}>
              Thêm
            </Button>
          </form>
        </section>
      </div> : null}

      {canManageIpAllowlist ? <div className="mt-6">
        <Table headers={["STT", "IP / CIDR", "Actions"]}>
          {loading ? (
            <TableLoading colSpan={3} />
          ) : !settings || settings.ips.length === 0 ? (
            <TableEmpty colSpan={3} message="Chưa có IP nào — thêm IP của bạn trước khi bật." />
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
                    Xóa
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