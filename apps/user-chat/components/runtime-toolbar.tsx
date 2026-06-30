"use client";

import { useRuntimeChatOptions } from "@/lib/runtime-chat-options";
import { useEffect, useState } from "react";

type PublicConfig = {
  defaultChatPipeline: string;
  defaultTopK: number;
  showRuntimeToolbar: boolean;
  pipelines: Array<string | { id?: string; name?: string }>;
};

const TOP_K_OPTIONS = [3, 5, 8, 10, 15];

function pipelineLabel(entry: string | { id?: string; name?: string }) {
  if (typeof entry === "string") return entry;
  return entry.name ?? entry.id ?? "pipeline";
}

function pipelineValue(entry: string | { id?: string; name?: string }) {
  if (typeof entry === "string") return entry;
  return entry.id ?? entry.name ?? "";
}

export function RuntimeToolbar() {
  const { setPipeline, setTopK } = useRuntimeChatOptions();
  const [config, setConfig] = useState<PublicConfig | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/config", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: PublicConfig | null) => {
        if (cancelled || !payload?.showRuntimeToolbar) return;
        setConfig(payload);
        setPipeline(payload.defaultChatPipeline);
        setTopK(payload.defaultTopK);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [setPipeline, setTopK]);

  if (!config?.showRuntimeToolbar) return null;

  const pipelines =
    config.pipelines.length > 0
      ? config.pipelines
      : [config.defaultChatPipeline];

  return (
    <div
      data-slot="aui_runtime-toolbar"
      className="border-border/60 bg-muted/30 text-muted-foreground mx-auto flex w-full max-w-(--thread-max-width) flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs"
    >
      <span className="text-foreground font-medium">Staging</span>
      <label className="flex items-center gap-1.5">
        <span>Pipeline</span>
        <select
          className="bg-background border-border rounded-md border px-2 py-1 text-xs"
          defaultValue={config.defaultChatPipeline}
          onChange={(event) => setPipeline(event.target.value)}
        >
          {pipelines.map((entry) => {
            const value = pipelineValue(entry);
            if (!value) return null;
            return (
              <option key={value} value={value}>
                {pipelineLabel(entry)}
              </option>
            );
          })}
        </select>
      </label>
      <label className="flex items-center gap-1.5">
        <span>Top K</span>
        <select
          className="bg-background border-border rounded-md border px-2 py-1 text-xs"
          defaultValue={String(config.defaultTopK)}
          onChange={(event) => setTopK(Number(event.target.value))}
        >
          {TOP_K_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}