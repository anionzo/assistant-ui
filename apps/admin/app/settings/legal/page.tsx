"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, RefreshCw } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { StatusBanner } from "@/components/status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminMe } from "@/hooks/use-admin-me";
import { useT } from "@idx/i18n";

type LegalSection = { id: string; title: string; body: string };
type LegalDocument = {
  useCustom: boolean;
  title: string;
  updatedLabel: string;
  intro: string;
  sections: LegalSection[];
};
type LegalHome = {
  useCustom: boolean;
  eyebrow: string;
  description: string;
  features: Array<{ title: string; body: string }>;
};
type LegalDisplay = {
  footerOnPublicPages: boolean;
  footerOnAuthPages: boolean;
  showHomeFeatures: boolean;
  showHomeCtaRegister: boolean;
};
type LegalSettings = {
  locales: { vi: { privacy: LegalDocument; terms: LegalDocument; home: LegalHome }; en: { privacy: LegalDocument; terms: LegalDocument; home: LegalHome } };
  display: LegalDisplay;
  updatedAt: string | null;
};

type TabId = "privacy" | "terms" | "home" | "display";
type LocaleId = "vi" | "en";

export default function LegalSettingsPage() {
  const t = useT();
  const { loading: meLoading, canManageLegal, canReadLegal } = useAdminMe();
  const [legal, setLegal] = useState<LegalSettings | null>(null);
  const [tab, setTab] = useState<TabId>("privacy");
  const [locale, setLocale] = useState<LocaleId>("vi");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    if (!canReadLegal) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/settings/legal");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : t("legal.loadFailed"));
      setLegal((data as { legal: LegalSettings }).legal);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("legal.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [canReadLegal, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function savePatch(body: Record<string, unknown>) {
    if (!canManageLegal) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/settings/legal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : t("legal.saveFailed"));
      setLegal((data as { legal: LegalSettings }).legal);
      setSuccess(t("legal.saved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("legal.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  function updateDocument(document: "privacy" | "terms", updater: (doc: LegalDocument) => LegalDocument) {
    if (!legal) return;
    setLegal({
      ...legal,
      locales: {
        ...legal.locales,
        [locale]: {
          ...legal.locales[locale],
          [document]: updater(legal.locales[locale][document]),
        },
      },
    });
  }

  function updateHome(updater: (home: LegalHome) => LegalHome) {
    if (!legal) return;
    setLegal({
      ...legal,
      locales: {
        ...legal.locales,
        [locale]: {
          ...legal.locales[locale],
          home: updater(legal.locales[locale].home),
        },
      },
    });
  }

  const currentBundle = legal?.locales[locale];
  const currentDoc = tab === "privacy" || tab === "terms" ? currentBundle?.[tab] : null;

  if (meLoading) {
    return (
      <AdminShell title={t("legal.title")}>
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </AdminShell>
    );
  }

  if (!canReadLegal) {
    return (
      <AdminShell title={t("legal.title")}>
        <StatusBanner tone="error">{t("legal.noAccess")}</StatusBanner>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={t("legal.title")} description={t("legal.subtitle")}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["privacy", "terms", "home", "display"] as TabId[]).map((id) => (
          <Button key={id} variant={tab === id ? "default" : "outline"} size="sm" onClick={() => setTab(id)}>
            {t(`legal.tab.${id}`)}
          </Button>
        ))}
        {tab !== "display" ? (
          <div className="ml-auto flex gap-1">
            {(["vi", "en"] as LocaleId[]).map((id) => (
              <Button key={id} variant={locale === id ? "secondary" : "ghost"} size="sm" onClick={() => setLocale(id)}>
                {id.toUpperCase()}
              </Button>
            ))}
          </div>
        ) : null}
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="size-3.5" />
        </Button>
      </div>

      {error ? <div className="mb-4"><StatusBanner tone="error">{error}</StatusBanner></div> : null}
      {success ? <div className="mb-4"><StatusBanner tone="success">{success}</StatusBanner></div> : null}

      {loading || !legal ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : tab === "display" ? (
        <section className="max-w-xl space-y-4 rounded-lg border border-border p-4">
          {([
            ["footerOnPublicPages", t("legal.display.footerPublic")] as const,
            ["footerOnAuthPages", t("legal.display.footerAuth")] as const,
            ["showHomeFeatures", t("legal.display.homeFeatures")] as const,
            ["showHomeCtaRegister", t("legal.display.homeRegister")] as const,
          ]).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={legal.display[key]}
                onChange={(e) => setLegal({ ...legal, display: { ...legal.display, [key]: e.target.checked } })}
                disabled={!canManageLegal}
              />
              {label}
            </label>
          ))}
          {canManageLegal ? (
            <Button disabled={saving} onClick={() => void savePatch({ display: legal.display })}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          ) : null}
        </section>
      ) : tab === "home" && currentBundle ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-border p-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={currentBundle.home.useCustom}
                onChange={(e) => updateHome((home) => ({ ...home, useCustom: e.target.checked }))}
                disabled={!canManageLegal}
              />
              {t("legal.useCustom")}
            </label>
            <label className="block text-sm">{t("legal.home.eyebrow")}
              <Input className="mt-1" value={currentBundle.home.eyebrow} onChange={(e) => updateHome((h) => ({ ...h, eyebrow: e.target.value }))} disabled={!canManageLegal} />
            </label>
            <label className="block text-sm">{t("legal.home.description")}
              <textarea className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" rows={4} value={currentBundle.home.description} onChange={(e) => updateHome((h) => ({ ...h, description: e.target.value }))} disabled={!canManageLegal} />
            </label>
            {currentBundle.home.features.map((feature, index) => (
              <div key={index} className="space-y-2 rounded-md border border-dashed p-3">
                <Input value={feature.title} onChange={(e) => updateHome((h) => ({ ...h, features: h.features.map((f, i) => i === index ? { ...f, title: e.target.value } : f) }))} disabled={!canManageLegal} />
                <textarea className="w-full rounded-md border border-border px-3 py-2 text-sm" rows={3} value={feature.body} onChange={(e) => updateHome((h) => ({ ...h, features: h.features.map((f, i) => i === index ? { ...f, body: e.target.value } : f) }))} disabled={!canManageLegal} />
              </div>
            ))}
            {canManageLegal ? (
              <Button disabled={saving} onClick={() => void savePatch({ locale, document: "home", patch: currentBundle.home })}>
                {saving ? t("common.saving") : t("common.save")}
              </Button>
            ) : null}
          </div>
          <PreviewHome home={currentBundle.home} />
        </section>
      ) : currentDoc ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border border-border p-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={currentDoc.useCustom}
                onChange={(e) => updateDocument(tab as "privacy" | "terms", (doc) => ({ ...doc, useCustom: e.target.checked }))}
                disabled={!canManageLegal}
              />
              {t("legal.useCustom")}
            </label>
            <label className="block text-sm">{t("legal.doc.title")}
              <Input className="mt-1" value={currentDoc.title} onChange={(e) => updateDocument(tab as "privacy" | "terms", (d) => ({ ...d, title: e.target.value }))} disabled={!canManageLegal} />
            </label>
            <label className="block text-sm">{t("legal.doc.updated")}
              <Input className="mt-1" value={currentDoc.updatedLabel} onChange={(e) => updateDocument(tab as "privacy" | "terms", (d) => ({ ...d, updatedLabel: e.target.value }))} disabled={!canManageLegal} />
            </label>
            <label className="block text-sm">{t("legal.doc.intro")}
              <textarea className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" rows={3} value={currentDoc.intro} onChange={(e) => updateDocument(tab as "privacy" | "terms", (d) => ({ ...d, intro: e.target.value }))} disabled={!canManageLegal} />
            </label>
            {currentDoc.sections.map((section, index) => (
              <div key={section.id} className="space-y-2 rounded-md border border-dashed p-3">
                <div className="flex gap-2">
                  <Input value={section.title} onChange={(e) => updateDocument(tab as "privacy" | "terms", (d) => ({ ...d, sections: d.sections.map((s, i) => i === index ? { ...s, title: e.target.value } : s) }))} disabled={!canManageLegal} />
                  {canManageLegal ? (
                    <Button variant="ghost" size="sm" onClick={() => updateDocument(tab as "privacy" | "terms", (d) => ({ ...d, sections: d.sections.filter((_, i) => i !== index) }))}>×</Button>
                  ) : null}
                </div>
                <textarea className="w-full rounded-md border border-border px-3 py-2 text-sm" rows={4} value={section.body} onChange={(e) => updateDocument(tab as "privacy" | "terms", (d) => ({ ...d, sections: d.sections.map((s, i) => i === index ? { ...s, body: e.target.value } : s) }))} disabled={!canManageLegal} />
              </div>
            ))}
            {canManageLegal ? (
              <>
                <Button variant="outline" size="sm" onClick={() => updateDocument(tab as "privacy" | "terms", (d) => ({ ...d, sections: [...d.sections, { id: crypto.randomUUID(), title: "", body: "" }] }))}>
                  {t("legal.addSection")}
                </Button>
                <Button disabled={saving} onClick={() => void savePatch({ locale, document: tab, patch: currentDoc })}>
                  {saving ? t("common.saving") : t("common.save")}
                </Button>
              </>
            ) : null}
          </div>
          <PreviewDocument doc={currentDoc} />
        </section>
      ) : null}
    </AdminShell>
  );
}

function PreviewDocument({ doc }: { doc: LegalDocument }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
      <div className="mb-3 flex items-center gap-2 text-muted-foreground">
        <FileText className="size-4" />
        Preview
      </div>
      <h2 className="text-lg font-semibold">{doc.title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{doc.updatedLabel}</p>
      <p className="mt-3 whitespace-pre-line text-muted-foreground">{doc.intro}</p>
      <div className="mt-4 space-y-3">
        {doc.sections.map((section) => (
          <div key={section.id}>
            <h3 className="font-medium">{section.title}</h3>
            <p className="mt-1 whitespace-pre-line text-muted-foreground">{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewHome({ home }: { home: LegalHome }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
      <p className="text-xs font-medium uppercase text-muted-foreground">{home.eyebrow}</p>
      <p className="mt-2 whitespace-pre-line">{home.description}</p>
      <div className="mt-4 space-y-2">
        {home.features.map((feature, index) => (
          <div key={index} className="rounded-md border border-border bg-background p-3">
            <p className="font-medium">{feature.title}</p>
            <p className="mt-1 text-muted-foreground">{feature.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}