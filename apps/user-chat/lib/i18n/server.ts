import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "@idx/i18n";
import { getMessages } from "@/lib/i18n/catalog";

export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
}

export async function getRequestMessages() {
  const locale = await getRequestLocale();
  return { locale, messages: getMessages(locale) };
}