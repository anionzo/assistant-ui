"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { useBranding } from "@/hooks/use-branding";
import { useT } from "@idx/i18n";
import { PublicLegalFooter } from "@/components/public/public-site-shell";
import { useLegalDisplay } from "@/hooks/use-legal-display";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  const { branding } = useBranding();
  const legalDisplay = useLegalDisplay();
  const t = useT();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <BrandLogo src={branding.logoUrl} alt={branding.appName} size={44} />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold">{branding.appName}</h1>
            <p className="truncate text-sm text-muted-foreground">{branding.tagline}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{t("auth.registerSubtitle")}</p>
        <div className="mt-6">
          <RegisterForm />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {t("auth.hasAccount")}{" "}
          <Link href="/login" className="text-primary underline">{t("auth.login")}</Link>
        </p>
        <div className="mt-6">
          <PublicLegalFooter enabled={legalDisplay.footerOnAuthPages} />
        </div>
      </div>
    </main>
  );
}