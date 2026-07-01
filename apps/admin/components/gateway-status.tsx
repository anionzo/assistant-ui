"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@idx/i18n";

type Status = {
  gateway: "ok" | "error";
  message?: string;
  collectionCount?: number;
  gatewayHost?: string;
};

export function GatewayStatus({ className }: { className?: string }) {
  const t = useT();
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
      <p className={cn("flex items-center gap-1.5 text-[11px] text-muted-foreground", className)}>
        <span className="size-1.5 rounded-full bg-muted-foreground/40" />
        {t("gateway.checking")}
      </p>
    );
  }

  const ok = status.gateway === "ok";
  return (
    <p
      title={status.message ?? status.gatewayHost}
      className={cn("flex items-center gap-1.5 text-[11px]", className)}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          ok ? "bg-emerald-500" : "bg-destructive",
        )}
      />
      <span className={cn(ok ? "text-muted-foreground" : "text-destructive")}>
        {ok
          ? t("gateway.ok", { count: status.collectionCount ?? 0 })
          : `${t("gateway.error")}${status.message ? `: ${status.message}` : ""}`}
      </span>
    </p>
  );
}