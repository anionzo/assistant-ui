"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { useBranding } from "@/hooks/use-branding";
import { useT } from "@idx/i18n";
import type { LegalDisplayConfig } from "@/lib/server/public-legal";
import { cn } from "@/lib/utils";

const DEFAULT_DISPLAY: LegalDisplayConfig = {
  footerOnPublicPages: true,
  footerOnAuthPages: true,
  showHomeFeatures: true,
  showHomeCtaRegister: true,
};

export function PublicSiteShell({
  children,
  className,
  display = DEFAULT_DISPLAY,
}: {
  children: React.ReactNode;
  className?: string;
  display?: LegalDisplayConfig;
}) {
  const { branding } = useBranding();
  const t = useT();

  return (
    <div className={cn("flex min-h-dvh flex-col bg-[#f7fafb] text-slate-950", className)}>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/86 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90">
            <BrandLogo src={branding.logoUrl} alt={branding.appName} size={38} className="rounded-lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-slate-950 sm:text-base">
                {branding.appName}
              </p>
              <p className="hidden truncate text-xs text-slate-500 sm:block">{branding.tagline}</p>
            </div>
          </Link>
          <nav className="flex shrink-0 items-center gap-2">
            <Link
              href="/chat"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden text-slate-600 hover:bg-slate-100 hover:text-slate-950 sm:inline-flex",
              )}
            >
              {t("nav.chat")}
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "sm" }),
                "h-8 bg-slate-950 px-3 text-white shadow-sm hover:bg-slate-800",
              )}
            >
              {t("nav.login")}
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {display.footerOnPublicPages ? (
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-balance">
              {t("legal.copyright", { year: String(new Date().getFullYear()), appName: branding.appName })}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/privacy" className="underline-offset-4 hover:text-slate-950 hover:underline">
                {t("legal.privacyLink")}
              </Link>
              <Link href="/terms" className="underline-offset-4 hover:text-slate-950 hover:underline">
                {t("legal.termsLink")}
              </Link>
            </div>
          </div>
        </footer>
      ) : null}
    </div>
  );
}

export function PublicLegalFooter({ enabled = true }: { enabled?: boolean }) {
  const t = useT();
  if (!enabled) return null;

  return (
    <p className="text-center text-xs text-muted-foreground">
      <Link href="/privacy" className="underline-offset-4 hover:underline">
        {t("legal.privacyLink")}
      </Link>
      {" · "}
      <Link href="/terms" className="underline-offset-4 hover:underline">
        {t("legal.termsLink")}
      </Link>
    </p>
  );
}
