import { cn } from "@/lib/utils";
import { Loader2Icon } from "lucide-react";

type LoadingSpinnerProps = {
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClass = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
} as const;

export function LoadingSpinner({
  label,
  className,
  size = "md",
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("flex flex-col items-center justify-center gap-2", className)}
    >
      <Loader2Icon
        className={cn("text-muted-foreground animate-spin", sizeClass[size])}
        aria-hidden
      />
      {label ? (
        <span className="text-muted-foreground text-sm">{label}</span>
      ) : (
        <span className="sr-only">Đang tải</span>
      )}
    </div>
  );
}

export function LoadingCenter({
  label = "Đang tải...",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[min(40vh,320px)] flex-1 items-center justify-center",
        className,
      )}
    >
      <LoadingSpinner label={label} size="lg" />
    </div>
  );
}