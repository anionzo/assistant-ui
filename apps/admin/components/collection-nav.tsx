import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle2, Cloud, FileUp, Search, Settings, Sliders } from "lucide-react";
import type { ReactNode } from "react";

const steps = [
  { slug: "files", label: "Upload", icon: FileUp, description: "Upload source files" },
  { slug: "documents", label: "Review", icon: Search, description: "Verify chunks & QA" },
  { slug: "search", label: "Test", icon: Sliders, description: "Test retrieval" },
] as const;

const settings = [
  { slug: "settings", label: "Settings", icon: Settings },
] as const;

export function CollectionNav({
  collectionId,
  active,
}: {
  collectionId: string;
  active: (typeof steps)[number]["slug"] | "settings";
}) {
  const activeIndex = steps.findIndex((s) => s.slug === active);

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const isActive = step.slug === active;
        const isPast = activeIndex !== -1 && i < activeIndex;
        return (
          <Link
            key={step.slug}
            href={`/collections/${collectionId}/${step.slug}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : isPast
                  ? "text-primary hover:bg-primary/10"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {isPast ? (
              <CheckCircle2 className="size-3.5" />
            ) : isActive ? (
              <step.icon className="size-3.5" />
            ) : (
              <step.icon className="size-3.5" />
            )}
            {step.label}
            {i < steps.length - 1 ? (
              <ArrowRight className="size-3 text-muted-foreground/50 ml-0.5" />
            ) : null}
          </Link>
        );
      })}
      {settings.map((item) => {
        const isActive = item.slug === active;
        return (
          <Link
            key={item.slug}
            href={`/collections/${collectionId}/${item.slug}`}
            className={cn(
              "ml-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-3.5" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
