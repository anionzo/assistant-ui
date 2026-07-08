"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export interface ResizableSplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  className?: string;
  /** Key for localStorage persistence. If omitted, no persistence. */
  storageKey?: string;
  defaultRatio?: number;
  minRatio?: number;
  maxRatio?: number;
  /** Width of the drag handle in px */
  handleSize?: number;
  /** Accessible label for the separator handle */
  handleAriaLabel?: string;
}

const HANDLE_PX_DEFAULT = 6;
const DEFAULT_RATIO_DEFAULT = 0.62;
const MIN_RATIO_DEFAULT = 0.30;
const MAX_RATIO_DEFAULT = 0.70;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readStoredRatio(key: string, fallback: number, min: number, max: number): number {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    const n = parseFloat(stored);
    if (!Number.isFinite(n)) return fallback;
    return clamp(n, min, max);
  } catch {
    return fallback;
  }
}

function useMinLg() {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return matches;
}

export function ResizableSplitPane({
  left,
  right,
  className,
  storageKey,
  defaultRatio = DEFAULT_RATIO_DEFAULT,
  minRatio = MIN_RATIO_DEFAULT,
  maxRatio = MAX_RATIO_DEFAULT,
  handleSize = HANDLE_PX_DEFAULT,
  handleAriaLabel = "Kéo để chỉnh kích thước",
}: ResizableSplitPaneProps) {
  const [ratio, setRatio] = useState(defaultRatio);
  const [dragging, setDragging] = useState(false);
  const isWide = useMinLg();
  const containerRef = useRef<HTMLDivElement>(null);
  const ratioRef = useRef(defaultRatio);

  const effectiveMin = minRatio;
  const effectiveMax = maxRatio;

  useEffect(() => {
    if (!storageKey) {
      ratioRef.current = defaultRatio;
      setRatio(defaultRatio);
      return;
    }
    const stored = readStoredRatio(storageKey, defaultRatio, effectiveMin, effectiveMax);
    setRatio(stored);
    ratioRef.current = stored;
  }, [storageKey, defaultRatio, effectiveMin, effectiveMax]);

  const persistRatio = useCallback(
    (value: number) => {
      ratioRef.current = value;
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, String(value));
      } catch {
        /* ignore */
      }
    },
    [storageKey]
  );

  const updateRatioFromClientX = useCallback(
    (clientX: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const track = rect.width - handleSize;
      if (track <= 0) return;
      const next = clamp((clientX - rect.left) / track, effectiveMin, effectiveMax);
      setRatio(next);
      ratioRef.current = next;
    },
    [handleSize, effectiveMin, effectiveMax]
  );

  const endDrag = useCallback(() => {
    setDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    persistRatio(ratioRef.current);
  }, [persistRatio]);

  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      updateRatioFromClientX(e.clientX);
    },
    [updateRatioFromClientX]
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => updateRatioFromClientX(e.clientX);
    const onUp = () => endDrag();
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, updateRatioFromClientX, endDrag]);

  const onHandleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 0.08 : 0.04;
      let next = ratioRef.current;
      if (e.key === "ArrowLeft") next -= step;
      else if (e.key === "ArrowRight") next += step;
      else return;
      e.preventDefault();
      const clamped = clamp(next, effectiveMin, effectiveMax);
      setRatio(clamped);
      ratioRef.current = clamped;
      persistRatio(clamped);
    },
    [effectiveMin, effectiveMax, persistRatio]
  );

  const panelClass = "flex h-full min-h-0 min-w-0 flex-col overflow-hidden";

  // If no right content (e.g. FormArtifactPanel returns null when no active form),
  // just render the left full-width (no handle, no split).
  if (!right) {
    return (
      <div className={cn("flex min-h-0 flex-1", className)}>
        <div className={panelClass}>{left}</div>
      </div>
    );
  }

  if (!isWide) {
    return (
      <div className={cn("flex min-h-0 flex-1 flex-col gap-3", className)}>
        <div className={panelClass}>{left}</div>
        <div className={panelClass}>{right}</div>
      </div>
    );
  }

  const rightRatio = 1 - ratio;

  return (
    <div
      ref={containerRef}
      className={cn("grid h-full min-h-0 w-full flex-1 overflow-hidden", dragging && "select-none", className)}
      style={{
        gridTemplateColumns: `minmax(0, ${ratio}fr) ${handleSize}px minmax(0, ${rightRatio}fr)`,
        gridTemplateRows: "minmax(0, 1fr)",
      }}
    >
      <div className={panelClass}>{left}</div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuemin={effectiveMin * 100}
        aria-valuemax={effectiveMax * 100}
        aria-valuenow={Math.round(ratio * 100)}
        aria-label={handleAriaLabel}
        tabIndex={0}
        onKeyDown={onHandleKeyDown}
        onPointerDown={onHandlePointerDown}
        className={cn(
          "bg-border/70 hover:bg-primary/40 focus-visible:ring-ring/50 relative z-10 shrink-0 cursor-col-resize touch-none transition-colors",
          "before:absolute before:inset-y-0 before:-inset-x-2 before:content-['']",
          dragging && "bg-primary/50",
          "focus-visible:ring-[3px] focus-visible:outline-none",
        )}
      />

      <div className={panelClass}>{right}</div>
    </div>
  );
}
