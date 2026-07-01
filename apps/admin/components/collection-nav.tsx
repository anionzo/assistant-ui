"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useT } from "@idx/i18n";
import { ArrowRight, CheckCircle2, FileUp, Search, Settings, Sliders } from "lucide-react";

const stepSlugs = ["files", "documents", "search"] as const;
const stepIcons = { files: FileUp, documents: Search, search: Sliders } as const;
const stepLabelKeys = {
  files: "collections.navUpload",
  documents: "collections.navReview",
  search: "collections.navTest",
} as const;

export function CollectionNav({
  collectionId,
  active,
}: {
  collectionId: string;
  active: (typeof stepSlugs)[number] | "settings";
}) {
  const t = useT();
  const activeIndex = stepSlugs.findIndex((s) => s === active);

  return (
    <div className="flex items-center gap-1">
      {stepSlugs.map((slug, i) => {
        const isActive = slug === active;
        const isPast = activeIndex !== -1 && i < activeIndex;
        const Icon = stepIcons[slug];
        return (
          <Link
            key={slug}
            href={`/collections/${collectionId}/${slug}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : isPast
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {isPast ? <CheckCircle2 className="size-3.5" /> : <Icon className="size-3.5" />}
            {t(stepLabelKeys[slug])}
            {i < stepSlugs.length - 1 ? (
              <ArrowRight className="size-3 text-muted-foreground/50 ml-0.5" />
            ) : null}
          </Link>
        );
      })}
      <Link
        href={`/collections/${collectionId}/settings`}
        className={cn(
          "ml-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
          active === "settings"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Settings className="size-3.5" />
        {t("collections.navSettings")}
      </Link>
    </div>
  );
}