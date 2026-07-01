import type { Locale, MessageTree } from "@idx/i18n";
import en from "@/messages/en.json";
import vi from "@/messages/vi.json";

export const MESSAGE_CATALOG: Record<Locale, MessageTree> = {
  vi: vi as MessageTree,
  en: en as MessageTree,
};

export function getMessages(locale: Locale): MessageTree {
  return MESSAGE_CATALOG[locale] ?? MESSAGE_CATALOG.vi;
}