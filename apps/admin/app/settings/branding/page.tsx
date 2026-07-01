"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { BrandLogo } from "@/components/brand-logo";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminMe } from "@/hooks/use-admin-me";
import { DEFAULT_LOGO_URL } from "@/lib/branding-defaults";

type BrandingSurface = {
  appName: string;
  tagline: string;
};

type Branding = {
  logoUrl: string;
  admin: BrandingSurface;
  user: BrandingSurface;
  updatedAt: string | null;
};

function PreviewCard({
  title,
  logoUrl,
  surface,
}: {
  title: string;
  logoUrl: string;
  surface: BrandingSurface;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="flex items-center gap-3">
        <BrandLogo src={logoUrl} alt={surface.appName} size={40} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{surface.appName}</p>
          <p className="truncate text-xs text-muted-foreground">{surface.tagline}</p>
        </div>
      </div>
    </div>
  );
}

export default function BrandingSettingsPage() {
  const { loading: meLoading, canManageBranding, canReadBranding } = useAdminMe();
  const [branding, setBranding] = useState<Branding | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [adminAppName, setAdminAppName] = useState("");
  const [adminTagline, setAdminTagline] = useState("");
  const [userAppName, setUserAppName] = useState("");
  const [userTagline, setUserTagline] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    if (!canReadBranding) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/settings/branding");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Không tải được branding");
      }
      const next = (data as { branding: Branding }).branding;
      setBranding(next);
      setLogoUrl(next.logoUrl);
      setAdminAppName(next.admin.appName);
      setAdminTagline(next.admin.tagline);
      setUserAppName(next.user.appName);
      setUserTagline(next.user.tagline);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      setBranding(null);
    } finally {
      setLoading(false);
    }
  }, [canReadBranding]);

  useEffect(() => {
    if (!meLoading && canReadBranding) void load();
    if (!meLoading && !canReadBranding) setLoading(false);
  }, [load, meLoading, canReadBranding]);

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/settings/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logoUrl,
          admin: { appName: adminAppName, tagline: adminTagline },
          user: { appName: userAppName, tagline: userTagline },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Cập nhật thất bại");
      }
      const next = (data as { branding: Branding }).branding;
      setBranding(next);
      setSuccess("Đã lưu branding cho admin và user chat.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  const previewLogo = logoUrl || DEFAULT_LOGO_URL;

  return (
    <AdminShell
      title="Branding"
      description="Logo chung và tên hiển thị cho Admin / User Chat."
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || saving}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      {!meLoading && !canReadBranding ? (
        <StatusBanner tone="error">Bạn không có quyền xem trang này.</StatusBanner>
      ) : null}

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}
      {success ? <StatusBanner tone="success">{success}</StatusBanner> : null}

      {canReadBranding ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-[280px_1fr]">
          <section className="space-y-3 rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
            <PreviewCard
              title="Admin"
              logoUrl={previewLogo}
              surface={{ appName: adminAppName, tagline: adminTagline }}
            />
            <PreviewCard
              title="User Chat"
              logoUrl={previewLogo}
              surface={{ appName: userAppName, tagline: userTagline }}
            />
            {branding?.updatedAt ? (
              <p className="text-[11px] text-muted-foreground">
                Cập nhật: {new Date(branding.updatedAt).toLocaleString()}
              </p>
            ) : null}
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <div className="space-y-1">
                <label className="text-sm font-medium">Logo URL (chung)</label>
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder={DEFAULT_LOGO_URL}
                  readOnly={!canManageBranding}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 rounded-lg border border-border p-3">
                  <p className="text-sm font-semibold">Admin</p>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Tên app</label>
                    <Input value={adminAppName} onChange={(e) => setAdminAppName(e.target.value)} readOnly={!canManageBranding} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Tagline</label>
                    <Input value={adminTagline} onChange={(e) => setAdminTagline(e.target.value)} readOnly={!canManageBranding} />
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-border p-3">
                  <p className="text-sm font-semibold">User Chat</p>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Tên app</label>
                    <Input value={userAppName} onChange={(e) => setUserAppName(e.target.value)} readOnly={!canManageBranding} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Tagline</label>
                    <Input value={userTagline} onChange={(e) => setUserTagline(e.target.value)} readOnly={!canManageBranding} />
                  </div>
                </div>
              </div>

              {canManageBranding ? (
                <Button type="submit" disabled={saving || loading}>
                  {saving ? "Đang lưu…" : "Lưu branding"}
                </Button>
              ) : null}
            </form>
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}