"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Status = {
  gateway: "ok" | "error";
  message?: string;
  collectionCount?: number;
  gatewayHost?: string;
};

export function GatewayStatus() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        const data = (await res.json()) as Status & { error?: string };
        if (!cancelled) {
          setStatus(
            res.ok
              ? data
              : { gateway: "error", message: data.error ?? `Status ${res.status}` },
          );
        }
      } catch (error) {
        if (!cancelled) {
          setStatus({
            gateway: "error",
            message: error instanceof Error ? error.message : "Status check failed",
          });
        }
      }
    }
    void load();
    const timer = setInterval(() => void load(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!status) {
    return (
      <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
        Gateway…
      </span>
    );
  }

  const ok = status.gateway === "ok";
  return (
    <span
      title={status.message ?? status.gatewayHost}
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        ok
          ? "bg-emerald-50 text-emerald-800"
          : "bg-destructive/10 text-destructive",
      )}
    >
      {ok
        ? `Gateway OK · ${status.collectionCount ?? 0} collections`
        : `Gateway error${status.message ? `: ${status.message}` : ""}`}
    </span>
  );
}