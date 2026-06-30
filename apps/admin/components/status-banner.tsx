import { cn } from "@/lib/utils";

export function StatusBanner({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        tone === "error" && "border-destructive/30 bg-destructive/5 text-destructive",
        tone === "success" && "border-emerald-300 bg-emerald-50 text-emerald-800",
        tone === "info" && "border-border bg-muted text-muted-foreground",
      )}
    >
      {children}
    </div>
  );
}