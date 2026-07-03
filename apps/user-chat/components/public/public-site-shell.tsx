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
    <div className={cn("flex min-h-dvh flex-col bg-background text-foreground", className)}>
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90">
            <BrandLogo src={branding.logoUrl} alt={branding.appName} size={40} className="rounded-lg" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{branding.appName}</p>
              <p className="truncate text-xs text-muted-foreground">{branding.tagline}</p>
            </div>
          </Link>
          <nav className="flex shrink-0 items-center gap-2">
            <Link href="/chat" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              {t("nav.chat")}
            </Link>
            <Link href="/login" className={cn(buttonVariants({ size: "sm" }))}>
              {t("nav.login")}
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {display.footerOnPublicPages ? (
        <footer className="border-t border-border bg-muted/30">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>{t("legal.copyright", { year: String(new Date().getFullYear()), appName: branding.appName })}</p>
            <div className="flex flex-wrap gap-4">
              <Link href="/privacy" className="underline-offset-4 hover:text-foreground hover:underline">
                {t("legal.privacyLink")}
              </Link>
              <Link href="/terms" className="underline-offset-4 hover:text-foreground hover:underline">
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