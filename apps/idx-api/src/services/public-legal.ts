import type { LegalDisplayConfig, LegalDocumentValue, LegalHomeValue } from "../db/config-types";
import { fallbackDocument, fallbackHome } from "./legal-defaults";
import { getLegalSettings, resolveLocale } from "./legal-config";

export type ResolvedLegalDocument = {
  title: string;
  updatedLabel: string;
  intro: string;
  sections: Array<{ id: string; title: string; body: string }>;
};

export type ResolvedLegalHome = {
  eyebrow: string;
  description: string;
  features: Array<{ title: string; body: string }>;
};

export type ResolvedPublicLegal = {
  locale: "vi" | "en";
  display: LegalDisplayConfig;
  privacy: ResolvedLegalDocument;
  terms: ResolvedLegalDocument;
  home: ResolvedLegalHome;
  updatedAt: string | null;
};

function resolveDocument(locale: "vi" | "en", stored: LegalDocumentValue, document: "privacy" | "terms"): ResolvedLegalDocument {
  const source = stored.useCustom ? stored : fallbackDocument(locale, document);
  return {
    title: source.title,
    updatedLabel: source.updatedLabel,
    intro: source.intro,
    sections: source.sections.map((section) => ({
      id: section.id,
      title: section.title,
      body: section.body,
    })),
  };
}

function resolveHome(locale: "vi" | "en", stored: LegalHomeValue): ResolvedLegalHome {
  const source = stored.useCustom ? stored : fallbackHome(locale);
  return {
    eyebrow: source.eyebrow,
    description: source.description,
    features: source.features.map((feature) => ({ title: feature.title, body: feature.body })),
  };
}

export async function getResolvedPublicLegal(localeInput?: string | null): Promise<ResolvedPublicLegal> {
  const locale = resolveLocale(localeInput);
  const settings = await getLegalSettings();
  const bundle = settings.locales[locale];

  return {
    locale,
    display: settings.display,
    privacy: resolveDocument(locale, bundle.privacy, "privacy"),
    terms: resolveDocument(locale, bundle.terms, "terms"),
    home: resolveHome(locale, bundle.home),
    updatedAt: settings.updatedAt,
  };
}

export async function getResolvedLegalDocument(
  document: "privacy" | "terms",
  localeInput?: string | null,
): Promise<ResolvedLegalDocument & { display: LegalDisplayConfig; updatedAt: string | null }> {
  const resolved = await getResolvedPublicLegal(localeInput);
  return {
    display: resolved.display,
    updatedAt: resolved.updatedAt,
    ...(document === "privacy" ? resolved.privacy : resolved.terms),
  };
}

export async function getResolvedLegalHome(localeInput?: string | null) {
  const resolved = await getResolvedPublicLegal(localeInput);
  return {
    display: resolved.display,
    updatedAt: resolved.updatedAt,
    ...resolved.home,
  };
}