"use client";

import { PublicSiteShell } from "@/components/public/public-site-shell";
import type { LegalDisplayConfig, ResolvedLegalDocument } from "@/lib/server/public-legal";

export function LegalDocumentPage({
  content,
  display,
}: {
  content: ResolvedLegalDocument;
  display: LegalDisplayConfig;
}) {
  return (
    <PublicSiteShell display={display}>
      <article className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
        <header className="border-b border-border pb-8">
          <h1 className="text-3xl font-semibold tracking-tight">{content.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{content.updatedLabel}</p>
          <p className="mt-4 leading-relaxed text-muted-foreground">{content.intro}</p>
        </header>

        <div className="mt-10 space-y-10">
          {content.sections.map((section) => (
            <section key={section.id}>
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </PublicSiteShell>
  );
}