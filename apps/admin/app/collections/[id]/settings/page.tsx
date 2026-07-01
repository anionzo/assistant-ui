"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Save } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { CollectionNav } from "@/components/collection-nav";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCollection, updateCollectionSettings } from "@/lib/api/collections";
import type { Collection } from "@/lib/types/gateway";
import { useT } from "@idx/i18n";

export default function SettingsPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const collectionId = decodeURIComponent(params.id);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [chunkSize, setChunkSize] = useState("512");
  const [chunkOverlap, setChunkOverlap] = useState("50");
  const [language, setLanguage] = useState("vi");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCollection(collectionId);
      setCollection(data);
      const cfg = data.parser_config ?? {};
      setChunkSize(String(cfg.chunk_size ?? 512));
      setChunkOverlap(String(cfg.chunk_overlap ?? 50));
      setLanguage(String(cfg.language ?? "vi"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("collections.loadSettingsFailed"));
    } finally {
      setLoading(false);
    }
  }, [collectionId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await updateCollectionSettings(collectionId, {
        ...(collection?.parser_config ?? {}),
        chunk_size: Number(chunkSize),
        chunk_overlap: Number(chunkOverlap),
        language,
      });
      setCollection(updated);
      setSuccess(t("collections.settingsSaved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("collections.saveSettingsFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title={t("collections.collectionTitle", { id: collectionId })}
      description={t("collections.settingsDescription")}
      sidebarContent={<CollectionNav collectionId={collectionId} active="settings" />}
    >
      {loading ? (
        <StatusBanner tone="info">{t("collections.loadingSettings")}</StatusBanner>
      ) : (
        <form onSubmit={(e) => void handleSave(e)} className="max-w-lg space-y-4 rounded-xl border border-border bg-card p-6">
          <div>
            <label className="mb-1 block text-sm font-medium">{t("collections.chunkSize")}</label>
            <Input value={chunkSize} onChange={(e) => setChunkSize(e.target.value)} inputMode="numeric" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("collections.chunkOverlap")}</label>
            <Input value={chunkOverlap} onChange={(e) => setChunkOverlap(e.target.value)} inputMode="numeric" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t("collections.language")}</label>
            <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="vi" required />
          </div>
          <Button type="submit" disabled={saving}>
            <Save className="size-4" />
            {saving ? t("common.saving") : t("collections.saveSettings")}
          </Button>
        </form>
      )}

      {error ? <div className="mt-4"><StatusBanner tone="error">{error}</StatusBanner></div> : null}
      {success ? <div className="mt-4"><StatusBanner tone="success">{success}</StatusBanner></div> : null}
    </AdminShell>
  );
}