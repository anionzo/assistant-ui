"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  type Locale,
  type MessageTree,
  translate,
} from "./core";

type I18nContextValue = {
  locale: Locale;
  messages: MessageTree;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale: initialLocale = DEFAULT_LOCALE,
  catalogs,
  onPersistLocale,
  children,
}: {
  locale?: Locale;
  catalogs: Record<Locale, MessageTree>;
  onPersistLocale: (locale: Locale) => Promise<void>;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState(initialLocale);
  const messages = catalogs[locale] ?? catalogs[DEFAULT_LOCALE];

  const setLocale = useCallback(
    async (next: Locale) => {
      if (next === locale || !catalogs[next]) return;
      await onPersistLocale(next);
      setLocaleState(next);
      if (typeof document !== "undefined") {
        document.documentElement.lang = next;
      }
    },
    [catalogs, locale, onPersistLocale],
  );

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(messages, key, params),
    [messages],
  );

  const value = useMemo(
    () => ({
      locale,
      messages,
      setLocale,
      t,
    }),
    [locale, messages, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

export function useT() {
  return useI18n().t;
}

export function useLocale() {
  return useI18n().locale;
}

export { DEFAULT_LOCALE };