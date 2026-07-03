import type { Locale } from "@idx/i18n";
import { getServerConfig } from "@/lib/server/config";

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

export type LegalDisplayConfig = {
  footerOnPublicPages: boolean;
  footerOnAuthPages: boolean;
  showHomeFeatures: boolean;
  showHomeCtaRegister: boolean;
};

export type ResolvedPublicLegal = {
  locale: Locale;
  display: LegalDisplayConfig;
  privacy: ResolvedLegalDocument;
  terms: ResolvedLegalDocument;
  home: ResolvedLegalHome;
  updatedAt: string | null;
};

const DEFAULT_DISPLAY: LegalDisplayConfig = {
  footerOnPublicPages: true,
  footerOnAuthPages: true,
  showHomeFeatures: true,
  showHomeCtaRegister: true,
};

let cache: { key: string; legal: ResolvedPublicLegal; expiresAt: number } | null = null;
const CACHE_TTL_MS = 10_000;

function unwrap<T>(payload: Record<string, unknown>, key: string): T | null {
  const data = payload.data ?? payload;
  if (!data || typeof data !== "object") return null;
  const nested = (data as Record<string, unknown>)[key];
  return (nested as T) ?? null;
}

export async function fetchPublicLegal(locale: Locale): Promise<ResolvedPublicLegal> {
  const cacheKey = locale;
  if (cache && cache.key === cacheKey && cache.expiresAt > Date.now()) {
    return cache.legal;
  }

  const { idxApiUrl } = getServerConfig();

  try {
    const response = await fetch(`${idxApiUrl}/public/legal?locale=${locale}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error("legal fetch failed");

    const payload = (await response.json()) as Record<string, unknown>;
    const legal = unwrap<ResolvedPublicLegal>(payload, "legal");
    if (!legal) throw new Error("invalid legal payload");

    const resolved: ResolvedPublicLegal = {
      locale: legal.locale ?? locale,
      display: { ...DEFAULT_DISPLAY, ...legal.display },
      privacy: legal.privacy,
      terms: legal.terms,
      home: legal.home,
      updatedAt: legal.updatedAt ?? null,
    };

    cache = { key: cacheKey, legal: resolved, expiresAt: Date.now() + CACHE_TTL_MS };
    return resolved;
  } catch (error) {
    throw error instanceof Error ? error : new Error("legal fetch failed");
  }
}

export async function fetchPublicLegalWithFallback(
  locale: Locale,
  fallback: ResolvedPublicLegal,
): Promise<ResolvedPublicLegal> {
  try {
    return await fetchPublicLegal(locale);
  } catch {
    return fallback;
  }
}

export function buildFallbackPublicLegal(locale: Locale, messages: Record<string, unknown>): ResolvedPublicLegal {
  const legal = (messages.legal ?? {}) as Record<string, Record<string, string>>;
  const home = (messages.home ?? {}) as Record<string, string>;

  function docFromKeys(prefix: string): ResolvedLegalDocument {
    const source = legal[prefix] ?? {};
    const sections = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"]
      .map((key) => ({
        id: key,
        title: source[`${key}Title`] ?? "",
        body: source[`${key}Body`] ?? "",
      }))
      .filter((section) => section.title && section.body);

    return {
      title: source.title ?? "",
      updatedLabel: source.updated ?? "",
      intro: source.intro ?? "",
      sections,
    };
  }

  return {
    locale,
    display: DEFAULT_DISPLAY,
    privacy: docFromKeys("privacy"),
    terms: docFromKeys("terms"),
    home: {
      eyebrow: home.eyebrow ?? "",
      description: home.description ?? "",
      features: [
        { title: home.featureChatTitle ?? "", body: home.featureChatBody ?? "" },
        { title: home.featureVoiceTitle ?? "", body: home.featureVoiceBody ?? "" },
        { title: home.featureSecureTitle ?? "", body: home.featureSecureBody ?? "" },
      ].filter((feature) => feature.title && feature.body),
    },
    updatedAt: null,
  };
}