"use client";

import type { RagSource } from "@/lib/rag-metadata";
import { useAuiState } from "@assistant-ui/react";
import { useState, type FC } from "react";
import { ChevronDownIcon, ChevronRightIcon, ExternalLinkIcon } from "lucide-react";

/** Tạm ẩn panel nguồn tham khảo trong chat; bật lại khi cần. */
const RAG_SOURCES_PANEL_ENABLED = false;

export const RagSourcesPanel: FC = () => {
  const [expanded, setExpanded] = useState(false);
  const contexts = useAuiState(
    (s) => (s.message?.metadata?.custom as Record<string, unknown> | undefined)?.ragContexts as RagSource[] | undefined,
  );

  if (!RAG_SOURCES_PANEL_ENABLED || !contexts?.length) return null;

  return (
    <div className="border-border/60 mt-3 rounded-lg border px-3 py-2 text-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-muted-foreground flex w-full items-center gap-1.5 font-medium"
      >
        {expanded ? <ChevronDownIcon className="size-3.5" /> : <ChevronRightIcon className="size-3.5" />}
        Nguồn tham khảo ({contexts.length})
      </button>

      {expanded && (
        <div className="mt-2 flex flex-col gap-2">
          {contexts.map((source, index) => (
            <SourceItem key={source.id ?? index} source={source} />
          ))}
        </div>
      )}
    </div>
  );
};

const SourceItem: FC<{ source: RagSource }> = ({ source }) => {
  const title =
    typeof source.metadata?.title === "string"
      ? source.metadata.title
      : typeof source.metadata?.source === "string"
        ? source.metadata.source
        : undefined;
  const url = typeof source.metadata?.url === "string" ? source.metadata.url : undefined;
  const score = source.score != null ? Math.round(source.score * 100) : undefined;

  return (
    <div className="border-border/40 hover:bg-muted/50 rounded-md border p-2 text-xs transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {title && <div className="mb-0.5 truncate font-medium">{title}</div>}
          <p className="text-muted-foreground line-clamp-3">{source.text}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {score != null && (
            <span
              className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                score >= 80
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  : score >= 50
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
              }`}
            >
              {score}
            </span>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLinkIcon className="size-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
