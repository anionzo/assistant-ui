import {
  CONFIG_DEFAULTS,
  CONFIG_KEYS,
  type LegalConfigValue,
  type LegalDisplayConfig,
  type LegalDocumentValue,
  type LegalHomeValue,
  type LegalLocaleBundle,
  type LegalSectionValue,
} from "../db/config-types";
import { getAppConfig, setAppConfig } from "../db/mongo/config-store";
import { buildDefaultLegalConfig } from "./legal-defaults";

export type PublicLegalSettings = LegalConfigValue & {
  updatedAt: string | null;
};

const MAX_TITLE = 120;
const MAX_UPDATED = 80;
const MAX_INTRO = 2000;
const MAX_BODY = 8000;
const MAX_SECTIONS = 20;
const MAX_FEATURES = 3;
const MAX_FEATURE_TITLE = 80;
const MAX_FEATURE_BODY = 500;
const MAX_EYEBROW = 80;
const MAX_DESCRIPTION = 2000;

function sanitizeText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\r\n/g, "\n");
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

function sanitizeSections(raw: unknown): LegalSectionValue[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0 || raw.length > MAX_SECTIONS) return null;

  const sections: LegalSectionValue[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const row = item as { id?: unknown; title?: unknown; body?: unknown };
    const id = typeof row.id === "string" && row.id.trim() ? row.id.trim().slice(0, 40) : crypto.randomUUID();
    const title = sanitizeText(row.title, MAX_TITLE);
    const body = sanitizeText(row.body, MAX_BODY);
    if (!title || !body) return null;
    sections.push({ id, title, body });
  }
  return sections;
}

function normalizeDocument(raw: unknown, fallback: LegalDocumentValue): LegalDocumentValue {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const value = raw as Partial<LegalDocumentValue>;
  return {
    useCustom: value.useCustom === true,
    title: typeof value.title === "string" && value.title.trim() ? value.title.trim().slice(0, MAX_TITLE) : fallback.title,
    updatedLabel:
      typeof value.updatedLabel === "string" && value.updatedLabel.trim()
        ? value.updatedLabel.trim().slice(0, MAX_UPDATED)
        : fallback.updatedLabel,
    intro: typeof value.intro === "string" && value.intro.trim() ? value.intro.trim().slice(0, MAX_INTRO) : fallback.intro,
    sections: Array.isArray(value.sections) && value.sections.length > 0
      ? (sanitizeSections(value.sections) ?? fallback.sections)
      : fallback.sections,
  };
}

function normalizeHome(raw: unknown, fallback: LegalHomeValue): LegalHomeValue {
  if (!raw || typeof raw !== "object") return { ...fallback };
  const value = raw as Partial<LegalHomeValue>;
  const features = Array.isArray(value.features)
    ? value.features
        .slice(0, MAX_FEATURES)
        .map((feature) => {
          if (!feature || typeof feature !== "object") return null;
          const title = sanitizeText((feature as LegalHomeValue["features"][number]).title, MAX_FEATURE_TITLE);
          const body = sanitizeText((feature as LegalHomeValue["features"][number]).body, MAX_FEATURE_BODY);
          if (!title || !body) return null;
          return { title, body };
        })
        .filter((feature): feature is LegalHomeValue["features"][number] => feature !== null)
    : fallback.features;

  return {
    useCustom: value.useCustom === true,
    eyebrow:
      typeof value.eyebrow === "string" && value.eyebrow.trim()
        ? value.eyebrow.trim().slice(0, MAX_EYEBROW)
        : fallback.eyebrow,
    description:
      typeof value.description === "string" && value.description.trim()
        ? value.description.trim().slice(0, MAX_DESCRIPTION)
        : fallback.description,
    features: features.length > 0 ? features : fallback.features,
  };
}

function normalizeLocaleBundle(raw: unknown, locale: "vi" | "en"): LegalLocaleBundle {
  const fallback = buildDefaultLegalConfig().locales[locale];
  if (!raw || typeof raw !== "object") return fallback;
  const value = raw as Partial<LegalLocaleBundle>;
  return {
    privacy: normalizeDocument(value.privacy, fallback.privacy),
    terms: normalizeDocument(value.terms, fallback.terms),
    home: normalizeHome(value.home, fallback.home),
  };
}

function normalizeLegalValue(raw: unknown): LegalConfigValue {
  const defaults = buildDefaultLegalConfig();
  if (!raw || typeof raw !== "object") return defaults;
  const value = raw as Partial<LegalConfigValue>;
  const display =
    value.display && typeof value.display === "object"
      ? (value.display as Partial<LegalDisplayConfig>)
      : {};

  return {
    locales: {
      vi: normalizeLocaleBundle(value.locales?.vi, "vi"),
      en: normalizeLocaleBundle(value.locales?.en, "en"),
    },
    display: {
      footerOnPublicPages: display.footerOnPublicPages !== false,
      footerOnAuthPages: display.footerOnAuthPages !== false,
      showHomeFeatures: display.showHomeFeatures !== false,
      showHomeCtaRegister: display.showHomeCtaRegister !== false,
    },
  };
}

function toPublicSettings(record: Awaited<ReturnType<typeof getAppConfig<typeof CONFIG_KEYS.systemLegal>>>): PublicLegalSettings {
  return {
    ...normalizeLegalValue(record.value),
    updatedAt: record.updatedAt,
  };
}

export async function getLegalSettings(): Promise<PublicLegalSettings> {
  const record = await getAppConfig(CONFIG_KEYS.systemLegal);
  return toPublicSettings(record);
}

type LegalDocumentPatch = Partial<{
  useCustom: boolean;
  title: string;
  updatedLabel: string;
  intro: string;
  sections: LegalSectionValue[];
}>;

type LegalHomePatch = Partial<{
  useCustom: boolean;
  eyebrow: string;
  description: string;
  features: LegalHomeValue["features"];
}>;

export async function updateLegalSettings(input: {
  display?: Partial<LegalDisplayConfig>;
  locale?: "vi" | "en";
  document?: "privacy" | "terms" | "home";
  patch?: LegalDocumentPatch | LegalHomePatch;
  updatedBy: string;
}): Promise<PublicLegalSettings> {
  const current = await getAppConfig(CONFIG_KEYS.systemLegal);
  const normalized = normalizeLegalValue(current.value);

  if (input.display) {
    if (input.display.footerOnPublicPages !== undefined) {
      normalized.display.footerOnPublicPages = input.display.footerOnPublicPages;
    }
    if (input.display.footerOnAuthPages !== undefined) {
      normalized.display.footerOnAuthPages = input.display.footerOnAuthPages;
    }
    if (input.display.showHomeFeatures !== undefined) {
      normalized.display.showHomeFeatures = input.display.showHomeFeatures;
    }
    if (input.display.showHomeCtaRegister !== undefined) {
      normalized.display.showHomeCtaRegister = input.display.showHomeCtaRegister;
    }
  }

  if (input.locale && input.document && input.patch) {
    const bundle = normalized.locales[input.locale];
    if (input.document === "home") {
      const patch = input.patch as LegalHomePatch;
      const currentHome = bundle.home;
      if (patch.useCustom !== undefined) currentHome.useCustom = patch.useCustom;
      if (patch.eyebrow !== undefined) {
        const eyebrow = sanitizeText(patch.eyebrow, MAX_EYEBROW);
        if (!eyebrow) throw new Error("invalid_home_eyebrow");
        currentHome.eyebrow = eyebrow;
      }
      if (patch.description !== undefined) {
        const description = sanitizeText(patch.description, MAX_DESCRIPTION);
        if (!description) throw new Error("invalid_home_description");
        currentHome.description = description;
      }
      if (patch.features !== undefined) {
        const features = patch.features
          .slice(0, MAX_FEATURES)
          .map((feature) => {
            const title = sanitizeText(feature.title, MAX_FEATURE_TITLE);
            const body = sanitizeText(feature.body, MAX_FEATURE_BODY);
            if (!title || !body) return null;
            return { title, body };
          })
          .filter((feature): feature is LegalHomeValue["features"][number] => feature !== null);
        if (features.length === 0) throw new Error("invalid_home_features");
        currentHome.features = features;
      }
    } else {
      const patch = input.patch as LegalDocumentPatch;
      const currentDoc = bundle[input.document];
      if (patch.useCustom !== undefined) currentDoc.useCustom = patch.useCustom;
      if (patch.title !== undefined) {
        const title = sanitizeText(patch.title, MAX_TITLE);
        if (!title) throw new Error(`invalid_${input.document}_title`);
        currentDoc.title = title;
      }
      if (patch.updatedLabel !== undefined) {
        const updatedLabel = sanitizeText(patch.updatedLabel, MAX_UPDATED);
        if (!updatedLabel) throw new Error(`invalid_${input.document}_updated`);
        currentDoc.updatedLabel = updatedLabel;
      }
      if (patch.intro !== undefined) {
        const intro = sanitizeText(patch.intro, MAX_INTRO);
        if (!intro) throw new Error(`invalid_${input.document}_intro`);
        currentDoc.intro = intro;
      }
      if (patch.sections !== undefined) {
        const sections = sanitizeSections(patch.sections);
        if (!sections) throw new Error(`invalid_${input.document}_sections`);
        currentDoc.sections = sections;
      }
    }
  }

  const saved = await setAppConfig(CONFIG_KEYS.systemLegal, normalized, {
    updatedBy: input.updatedBy,
  });
  return toPublicSettings(saved);
}

export function resolveLocale(locale?: string | null): "vi" | "en" {
  return locale === "en" ? "en" : "vi";
}