"use client";

import { I18nProvider, type Locale } from "@idx/i18n";
import { MESSAGE_CATALOG } from "@/lib/i18n/catalog";
import type { ReactNode } from "react";

async function persistLocale(locale: Locale) {
  await fetch("/api/locale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale }),
  });
}

export function AppI18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <I18nProvider locale={locale} catalogs={MESSAGE_CATALOG} onPersistLocale={persistLocale}>
      {children}
    </I18nProvider>
  );
}