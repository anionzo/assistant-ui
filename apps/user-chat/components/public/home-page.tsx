"use client";

import Link from "next/link";
import { PublicSiteShell } from "@/components/public/public-site-shell";
import { buttonVariants } from "@/components/ui/button";
import { useBranding } from "@/hooks/use-branding";
import { useT } from "@idx/i18n";
import type { LegalDisplayConfig, ResolvedLegalHome } from "@/lib/server/public-legal";
import { cn } from "@/lib/utils";

export function HomePage({
  home,
  display,
}: {
  home: ResolvedLegalHome;
  display: LegalDisplayConfig;
}) {
  const { branding } = useBranding();
  const t = useT();

  return (
    <PublicSiteShell display={display}>
      <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-primary">{home.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{branding.appName}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{branding.tagline}</p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{home.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/chat" className={cn(buttonVariants({ size: "lg" }))}>
              {t("home.ctaChat")}
            </Link>
            {display.showHomeCtaRegister ? (
              <Link href="/register" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                {t("home.ctaRegister")}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {display.showHomeFeatures && home.features.length > 0 ? (
        <section className="border-t border-border bg-muted/20">
          <div className="mx-auto grid w-full max-w-5xl gap-6 px-6 py-14 sm:grid-cols-3">
            {home.features.map((feature) => (
              <article key={feature.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-base font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </PublicSiteShell>
  );
}