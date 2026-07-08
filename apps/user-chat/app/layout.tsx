import type { Metadata } from "next";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppI18nProvider } from "@/components/app-i18n-provider";
import { getRequestLocale } from "@/lib/i18n/server";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const HUIT_LOGO_URL = "https://idx.huit.edu.vn/images/logo/logo.svg";

export const metadata: Metadata = {
  title: "Idx Chat",
  description: "Nền tảng trợ lý AI",
  icons: {
    icon: [{ url: HUIT_LOGO_URL, type: "image/svg+xml" }],
    apple: [{ url: HUIT_LOGO_URL, type: "image/svg+xml" }],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale} className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body>
        <AppI18nProvider locale={locale}>
          <TooltipProvider>{children}</TooltipProvider>
        </AppI18nProvider>
      </body>
    </html>
  );
}
