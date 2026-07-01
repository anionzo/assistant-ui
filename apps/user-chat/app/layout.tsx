import type { Metadata } from "next";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppI18nProvider } from "@/components/app-i18n-provider";
import { getRequestLocale } from "@/lib/i18n/server";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Idx Chat",
  description: "Trợ lý tuyển sinh HUIT",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale} className={cn("font-sans", geist.variable)}>
      <body>
        <AppI18nProvider locale={locale}>
          <TooltipProvider>{children}</TooltipProvider>
        </AppI18nProvider>
      </body>
    </html>
  );
}