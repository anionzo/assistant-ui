import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/public/legal-document-page";
import { resolvePublicLegal } from "@/lib/server/resolve-public-legal";

export async function generateMetadata(): Promise<Metadata> {
  const legal = await resolvePublicLegal();
  return {
    title: `${legal.privacy.title} — Idx Chat`,
    description: legal.privacy.intro.slice(0, 160),
    robots: { index: true, follow: true },
  };
}

export default async function PrivacyPage() {
  const legal = await resolvePublicLegal();
  return <LegalDocumentPage content={legal.privacy} display={legal.display} />;
}