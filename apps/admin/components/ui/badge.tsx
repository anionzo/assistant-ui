import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "default" | "success" | "warning" | "error" | "info";

const toneClass: Record<BadgeTone, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-emerald-50 text-emerald-800",
  warning: "bg-amber-50 text-amber-800",
  error: "bg-destructive/10 text-destructive",
  info: "bg-blue-50 text-blue-800",
};

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
