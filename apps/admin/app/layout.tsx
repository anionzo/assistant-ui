import type { Metadata } from "next";
import { AppI18nProvider } from "@/components/app-i18n-provider";
import { getRequestLocale } from "@/lib/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Idx Admin",
  description: "Operator console for document corpus and forms",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale}>
      <body>
        <AppI18nProvider locale={locale}>{children}</AppI18nProvider>
      </body>
    </html>
  );
}