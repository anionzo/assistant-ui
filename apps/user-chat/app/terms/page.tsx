import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/public/legal-document-page";
import { resolvePublicLegal } from "@/lib/server/resolve-public-legal";

export async function generateMetadata(): Promise<Metadata> {
  const legal = await resolvePublicLegal();
  return {
    title: `${legal.terms.title} — Idx Chat`,
    description: legal.terms.intro.slice(0, 160),
    robots: { index: true, follow: true },
  };
}

export default async function TermsPage() {
  const legal = await resolvePublicLegal();
  return <LegalDocumentPage content={legal.terms} display={legal.display} />;
}