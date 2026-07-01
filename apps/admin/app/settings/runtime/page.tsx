"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminMe } from "@/hooks/use-admin-me";
import { APP_CONFIG_FALLBACKS } from "@/lib/app-config-fallbacks";

type ChatRuntime = {
  tenantId: string;
  tenantDisplayName: string;
  defaultCorpusId: string;
  defaultChatPipeline: string;
  defaultVoicePipeline: string;
  defaultTopK: number;
  updatedAt: string | null;
};

export default function ChatRuntimeSettingsPage() {
  const { loading: meLoading, canManageRuntime, canReadRuntime } = useAdminMe();
  const [runtime, setRuntime] = useState<ChatRuntime | null>(null);
  const [tenantId, setTenantId] = useState("");
  const [tenantDisplayName, setTenantDisplayName] = useState("");
  const [defaultCorpusId, setDefaultCorpusId] = useState("");
  const [defaultChatPipeline, setDefaultChatPipeline] = useState("");
  const [defaultVoicePipeline, setDefaultVoicePipeline] = useState("");
  const [defaultTopK, setDefaultTopK] = useState("5");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const applyRuntime = useCallback((next: ChatRuntime) => {
    setRuntime(next);
    setTenantId(next.tenantId);
    setTenantDisplayName(next.tenantDisplayName);
    setDefaultCorpusId(next.defaultCorpusId);
    setDefaultChatPipeline(next.defaultChatPipeline);
    setDefaultVoicePipeline(next.defaultVoicePipeline);
    setDefaultTopK(String(next.defaultTopK));
  }, []);

  const load = useCallback(async () => {
    if (!canReadRuntime) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/settings/chat-runtime");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Không tải được chat runtime");
      }
      applyRuntime((data as { chatRuntime: ChatRuntime }).chatRuntime);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      setRuntime(null);
    } finally {
      setLoading(false);
    }
  }, [applyRuntime, canReadRuntime]);

  useEffect(() => {
    if (!meLoading && canReadRuntime) void load();
    if (!meLoading && !canReadRuntime) setLoading(false);
  }, [load, meLoading, canReadRuntime]);

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const topK = Number(defaultTopK);
      if (!Number.isInteger(topK) || topK < 1 || topK > 50) {
        throw new Error("Top K phải là số nguyên từ 1 đến 50");
      }

      const res = await fetch("/api/settings/chat-runtime", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          tenantDisplayName,
          defaultCorpusId,
          defaultChatPipeline,
          defaultVoicePipeline,
          defaultTopK: topK,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Cập nhật thất bại");
      }
      applyRuntime((data as { chatRuntime: ChatRuntime }).chatRuntime);
      setSuccess("Đã lưu cấu hình chat runtime cho user chat.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  const defaults = APP_CONFIG_FALLBACKS.chatRuntime;

  return (
    <AdminShell
      title="Chat Runtime"
      description="Tenant, corpus và pipeline mặc định cho user chat (app_config.system.chat_runtime)."
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || saving}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      <StatusBanner tone="info">
        Cấu hình lưu trong MongoDB <code>app_config</code>. User chat đọc qua{" "}
        <code>GET /public/app-config</code>. Cần <code>settings.runtime.read</code> để xem,{" "}
        <code>settings.runtime</code> hoặc role <strong>branding_admin</strong> để sửa.
      </StatusBanner>

      {!meLoading && !canReadRuntime ? (
        <StatusBanner tone="error">
          Bạn không có quyền xem chat runtime. Nhờ super_admin gán role{" "}
          <strong>branding_admin</strong> hoặc permission tương ứng.
        </StatusBanner>
      ) : null}

      {!meLoading && canReadRuntime && !canManageRuntime ? (
        <StatusBanner tone="info">
          Chế độ chỉ xem — không có quyền <code>settings.runtime</code> để lưu thay đổi.
        </StatusBanner>
      ) : null}

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}
      {success ? <StatusBanner tone="success">{success}</StatusBanner> : null}

      {canReadRuntime ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-[280px_1fr]">
          <section className="space-y-3 rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tóm tắt</p>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Tenant</dt>
                <dd className="font-mono text-xs">{tenantId || defaults.tenantId}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Corpus</dt>
                <dd className="font-mono text-xs">{defaultCorpusId || defaults.defaultCorpusId}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Chat pipeline</dt>
                <dd className="font-mono text-xs break-all">{defaultChatPipeline || defaults.defaultChatPipeline}</dd>
              </div>
            </dl>
            {runtime?.updatedAt ? (
              <p className="text-[11px] text-muted-foreground">
                Cập nhật: {new Date(runtime.updatedAt).toLocaleString()}
              </p>
            ) : null}
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Tenant ID</label>
                  <Input
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    placeholder={defaults.tenantId}
                    readOnly={!canManageRuntime}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Tên hiển thị tenant</label>
                  <Input
                    value={tenantDisplayName}
                    onChange={(e) => setTenantDisplayName(e.target.value)}
                    placeholder={defaults.tenantDisplayName}
                    readOnly={!canManageRuntime}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Corpus mặc định</label>
                <Input
                  value={defaultCorpusId}
                  onChange={(e) => setDefaultCorpusId(e.target.value)}
                  placeholder={defaults.defaultCorpusId}
                  readOnly={!canManageRuntime}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Chat pipeline</label>
                  <Input
                    value={defaultChatPipeline}
                    onChange={(e) => setDefaultChatPipeline(e.target.value)}
                    placeholder={defaults.defaultChatPipeline}
                    readOnly={!canManageRuntime}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Voice pipeline</label>
                  <Input
                    value={defaultVoicePipeline}
                    onChange={(e) => setDefaultVoicePipeline(e.target.value)}
                    placeholder={defaults.defaultVoicePipeline}
                    readOnly={!canManageRuntime}
                  />
                </div>
              </div>

              <div className="space-y-1 md:max-w-[12rem]">
                <label className="text-sm font-medium">Top K (1–50)</label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={defaultTopK}
                  onChange={(e) => setDefaultTopK(e.target.value)}
                  readOnly={!canManageRuntime}
                />
              </div>

              {canManageRuntime ? (
                <Button type="submit" disabled={saving || loading}>
                  {saving ? "Đang lưu…" : "Lưu chat runtime"}
                </Button>
              ) : null}
            </form>
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}