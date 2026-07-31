"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useT } from "@idx/i18n";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type OpsLogEntry = {
  id: string;
  ts: string;
  level: "info" | "warn" | "error";
  source: string;
  message: string;
  requestId?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  detail?: string;
};

type LevelFilter = "all" | "info" | "warn" | "error";

function levelTone(level: OpsLogEntry["level"]) {
  if (level === "error") return "bg-destructive/10 text-destructive ring-destructive/20";
  if (level === "warn") return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-muted text-muted-foreground ring-border";
}

export default function OpsLogsPage() {
  const t = useT();
  const [entries, setEntries] = useState<OpsLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [capacity, setCapacity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [level, setLevel] = useState<LevelFilter>("all");
  const [query, setQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const params = new URLSearchParams({ limit: "150", level });
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/ops/logs?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : `HTTP ${res.status}`,
        );
      }
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setTotal(Number(data.total) || 0);
      setCapacity(Number(data.capacity) || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("opsLogs.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [level, query, t]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => void load(), 4_000);
    return () => clearInterval(timer);
  }, [autoRefresh, load]);

  async function handleClear() {
    if (!confirm(t("opsLogs.clearConfirm"))) return;
    setError("");
    try {
      const res = await fetch("/api/ops/logs", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data?.error === "string" ? data.error : `HTTP ${res.status}`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("opsLogs.clearFailed"));
    }
  }

  return (
    <AdminShell
      title={t("opsLogs.title")}
      description={t("opsLogs.description")}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={autoRefresh ? "secondary" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
          >
            {autoRefresh ? t("opsLogs.autoOn") : t("opsLogs.autoOff")}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            {t("common.refresh")}
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={() => void handleClear()}>
            <Trash2 className="size-4" />
            {t("opsLogs.clear")}
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {t("opsLogs.filterLevel")}
          </label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as LevelFilter)}
            className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm"
          >
            <option value="all">{t("opsLogs.levelAll")}</option>
            <option value="error">{t("opsLogs.levelError")}</option>
            <option value="warn">{t("opsLogs.levelWarn")}</option>
            <option value="info">{t("opsLogs.levelInfo")}</option>
          </select>
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            {t("opsLogs.filterQuery")}
          </label>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("opsLogs.queryPlaceholder")}
            className="h-8"
          />
        </div>
        <p className="pb-1 text-xs text-muted-foreground">
          {t("opsLogs.bufferMeta", { total, capacity })}
        </p>
      </div>

      <StatusBanner tone="info">{t("opsLogs.hint")}</StatusBanner>

      {error ? (
        <div className="mt-3">
          <StatusBanner tone="error">{error}</StatusBanner>
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        {loading && entries.length === 0 ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("common.loading")}
          </div>
        ) : entries.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">{t("opsLogs.empty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((entry) => {
              const open = expandedId === entry.id;
              return (
                <li key={entry.id} className="px-4 py-3 text-sm">
                  <button
                    type="button"
                    className="flex w-full flex-col gap-1 text-left"
                    onClick={() => setExpandedId(open ? null : entry.id)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
                          levelTone(entry.level),
                        )}
                      >
                        {entry.level}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {entry.source}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {new Date(entry.ts).toLocaleString()}
                      </span>
                      {entry.status != null ? (
                        <span className="font-mono text-[11px]">HTTP {entry.status}</span>
                      ) : null}
                      {entry.durationMs != null ? (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {entry.durationMs}ms
                        </span>
                      ) : null}
                    </div>
                    <p className="break-words font-medium leading-snug">{entry.message}</p>
                    {(entry.method || entry.path) && (
                      <p className="font-mono text-xs text-muted-foreground">
                        {entry.method} {entry.path}
                      </p>
                    )}
                  </button>
                  {open ? (
                    <dl className="mt-2 grid gap-1 rounded-lg bg-muted/40 p-3 font-mono text-[11px] text-muted-foreground sm:grid-cols-2">
                      {entry.requestId ? (
                        <div className="sm:col-span-2">
                          <dt className="font-sans font-medium text-foreground">requestId</dt>
                          <dd className="break-all">{entry.requestId}</dd>
                        </div>
                      ) : null}
                      {entry.detail ? (
                        <div className="sm:col-span-2">
                          <dt className="font-sans font-medium text-foreground">detail</dt>
                          <dd className="whitespace-pre-wrap break-all">{entry.detail}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AdminShell>
  );
}
