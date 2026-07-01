import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card",
        padding && "p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      {title ? (
        <div className="border-b border-border bg-muted/30 px-4 py-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </div>
  );
}
