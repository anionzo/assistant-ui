import {
  buildFallbackPublicLegal,
  fetchPublicLegalWithFallback,
  type ResolvedPublicLegal,
} from "@/lib/server/public-legal";
import { getRequestLocale, getRequestMessages } from "@/lib/i18n/server";

export async function resolvePublicLegal(): Promise<ResolvedPublicLegal> {
  const { locale, messages } = await getRequestMessages();
  const fallback = buildFallbackPublicLegal(locale, messages as Record<string, unknown>);
  return fetchPublicLegalWithFallback(locale, fallback);
}