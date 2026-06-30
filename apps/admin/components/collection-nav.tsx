import Link from "next/link";
import { cn } from "@/lib/utils";

const tabs = [
  { slug: "files", label: "Files" },
  { slug: "documents", label: "Documents" },
  { slug: "settings", label: "Settings" },
  { slug: "search", label: "Chunk search" },
] as const;

export function CollectionNav({
  collectionId,
  active,
}: {
  collectionId: string;
  active: (typeof tabs)[number]["slug"];
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <Link
        href="/"
        className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        ← Collections
      </Link>
      {tabs.map((tab) => (
        <Link
          key={tab.slug}
          href={`/collections/${collectionId}/${tab.slug}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition",
            active === tab.slug
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}