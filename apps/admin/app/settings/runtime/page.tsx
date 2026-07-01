"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminMe } from "@/hooks/use-admin-me";
import { APP_CONFIG_FALLBACKS } from "@/lib/app-config-fallbacks";
import { useT } from "@idx/i18n";

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
  const t = useT();
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
        throw new Error(typeof data.error === "string" ? data.error : t("runtime.loadFailed"));
      }
      applyRuntime((data as { chatRuntime: ChatRuntime }).chatRuntime);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.loadFailed"));
      setRuntime(null);
    } finally {
      setLoading(false);
    }
  }, [applyRuntime, canReadRuntime, t]);

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
        throw new Error(t("runtime.topKInvalid"));
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
        throw new Error(typeof data.error === "string" ? data.error : t("common.updateFailed"));
      }
      applyRuntime((data as { chatRuntime: ChatRuntime }).chatRuntime);
      setSuccess(t("runtime.saved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.updateFailed"));
    } finally {
      setSaving(false);
    }
  }

  const defaults = APP_CONFIG_FALLBACKS.chatRuntime;

  return (
    <AdminShell
      title={t("runtime.title")}
      description={t("runtime.description")}
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || saving}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          {t("common.refresh")}
        </Button>
      }
    >
      {!meLoading && !canReadRuntime ? (
        <StatusBanner tone="error">{t("common.noAccess")}</StatusBanner>
      ) : null}

      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}
      {success ? <StatusBanner tone="success">{success}</StatusBanner> : null}

      {canReadRuntime ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-[280px_1fr]">
          <section className="space-y-3 rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("runtime.summary")}</p>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">{t("runtime.tenant")}</dt>
                <dd className="font-mono text-xs">{tenantId || defaults.tenantId}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("runtime.corpus")}</dt>
                <dd className="font-mono text-xs">{defaultCorpusId || defaults.defaultCorpusId}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("runtime.chatPipeline")}</dt>
                <dd className="font-mono text-xs break-all">{defaultChatPipeline || defaults.defaultChatPipeline}</dd>
              </div>
            </dl>
            {runtime?.updatedAt ? (
              <p className="text-[11px] text-muted-foreground">
                {t("common.updatedAt", { date: new Date(runtime.updatedAt).toLocaleString() })}
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
                  <label className="text-sm font-medium">{t("runtime.tenantId")}</label>
                  <Input
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    placeholder={defaults.tenantId}
                    readOnly={!canManageRuntime}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">{t("runtime.tenantDisplayName")}</label>
                  <Input
                    value={tenantDisplayName}
                    onChange={(e) => setTenantDisplayName(e.target.value)}
                    placeholder={defaults.tenantDisplayName}
                    readOnly={!canManageRuntime}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">{t("runtime.defaultCorpus")}</label>
                <Input
                  value={defaultCorpusId}
                  onChange={(e) => setDefaultCorpusId(e.target.value)}
                  placeholder={defaults.defaultCorpusId}
                  readOnly={!canManageRuntime}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">{t("runtime.chatPipeline")}</label>
                  <Input
                    value={defaultChatPipeline}
                    onChange={(e) => setDefaultChatPipeline(e.target.value)}
                    placeholder={defaults.defaultChatPipeline}
                    readOnly={!canManageRuntime}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">{t("runtime.voicePipeline")}</label>
                  <Input
                    value={defaultVoicePipeline}
                    onChange={(e) => setDefaultVoicePipeline(e.target.value)}
                    placeholder={defaults.defaultVoicePipeline}
                    readOnly={!canManageRuntime}
                  />
                </div>
              </div>

              <div className="space-y-1 md:max-w-[12rem]">
                <label className="text-sm font-medium">{t("runtime.topK")}</label>
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
                  {saving ? t("common.saving") : t("runtime.saveRuntime")}
                </Button>
              ) : null}
            </form>
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}