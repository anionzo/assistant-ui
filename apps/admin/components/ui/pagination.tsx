"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPageRange, PAGE_SIZE_OPTIONS, type PaginationMeta } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const controlHeight = "h-8";

export function PaginationBar({
  meta,
  onPageChange,
  pageSize,
  onPageSizeChange,
  className,
  variant = "embedded",
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  className?: string;
  /** embedded = footer inside table card; standalone = separate card below list */
  variant?: "embedded" | "standalone";
}) {
  if (meta.total === 0) return null;

  return (
    <div
      className={cn(
        "bg-muted/30 text-sm",
        variant === "embedded"
          ? "border-t border-border"
          : "overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
    >
      <div className="grid min-h-11 grid-cols-1 items-center gap-3 px-4 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
        <p className="text-sm leading-none text-muted-foreground tabular-nums">
          {formatPageRange(meta)}
        </p>

        <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
          {onPageSizeChange && pageSize ? (
            <label
              className={cn(
                "inline-flex items-center gap-1.5 text-xs leading-none text-muted-foreground",
                controlHeight,
              )}
            >
              <span className="whitespace-nowrap">Hiển thị</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className={cn(
                  controlHeight,
                  "min-w-[3.25rem] rounded-lg border border-border bg-background px-2 text-xs leading-none text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                )}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="whitespace-nowrap">/ trang</span>
            </label>
          ) : null}

          <div className={cn("inline-flex items-center gap-1.5", controlHeight)}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(controlHeight, "gap-1 px-2.5")}
              disabled={!meta.hasPrev}
              onClick={() => onPageChange(meta.page - 1)}
            >
              <ChevronLeft className="size-3.5 shrink-0" />
              <span>Trước</span>
            </Button>

            <span
              className={cn(
                controlHeight,
                "inline-flex min-w-[4.75rem] items-center justify-center rounded-lg border border-border bg-background px-2 text-xs font-medium tabular-nums text-muted-foreground",
              )}
            >
              {meta.page} / {meta.totalPages}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(controlHeight, "gap-1 px-2.5")}
              disabled={!meta.hasNext}
              onClick={() => onPageChange(meta.page + 1)}
            >
              <span>Sau</span>
              <ChevronRight className="size-3.5 shrink-0" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}