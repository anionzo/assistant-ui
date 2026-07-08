"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { type BrandingState, useBranding } from "@/hooks/use-branding";
import { useT } from "@idx/i18n";
import { PublicLegalFooter } from "@/components/public/public-site-shell";
import { useLegalDisplay } from "@/hooks/use-legal-display";
import { RegisterForm } from "./register-form";

export function RegisterPageClient({ initialBranding }: { initialBranding: BrandingState }) {
  const { branding } = useBranding(initialBranding);
  const legalDisplay = useLegalDisplay();
  const t = useT();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[linear-gradient(180deg,#ffffff_0%,#f7fafb_100%)] px-4 py-10 sm:px-6">
      <div className="w-full max-w-[500px] rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/8 sm:p-8">
        <div className="mb-7 flex items-center gap-3">
          <BrandLogo src={branding.logoUrl} alt={branding.appName} size={46} className="rounded-xl" />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-normal text-slate-950">{branding.appName}</h1>
            <p className="truncate text-sm text-slate-500">{branding.tagline}</p>
          </div>
        </div>
        <p className="text-sm leading-6 text-slate-600">{t("auth.registerSubtitle")}</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium text-slate-500">
          <span className="rounded-full bg-slate-100 px-2.5 py-1">{t("home.signalSync")}</span>
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-teal-700">{t("home.signalSources")}</span>
        </div>
        <div className="mt-7">
          <RegisterForm />
        </div>
        <p className="mt-5 text-center text-sm text-slate-600">
          {t("auth.hasAccount")}{" "}
          <Link href="/login" className="font-medium text-teal-700 underline-offset-4 hover:underline">
            {t("auth.login")}
          </Link>
        </p>
        <div className="mt-6">
          <PublicLegalFooter enabled={legalDisplay.footerOnAuthPages} />
        </div>
      </div>
    </main>
  );
}
