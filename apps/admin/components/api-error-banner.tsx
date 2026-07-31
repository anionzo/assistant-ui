"use client";

import { StatusBanner } from "@/components/status-banner";
import { formatBffError } from "@/lib/api/bff";
import { useT } from "@idx/i18n";

export function ApiErrorBanner({
  error,
  fallback,
}: {
  error: unknown;
  fallback?: string;
}) {
  const t = useT();
  const parsed = formatBffError(error, fallback ?? t("common.loadFailed"));
  const meta: string[] = [];
  if (parsed.status) meta.push(`HTTP ${parsed.status}`);
  if (parsed.code) meta.push(parsed.code);
  if (parsed.requestId) meta.push(`req ${parsed.requestId}`);

  return (
    <StatusBanner tone="error">
      <div className="space-y-1">
        <p className="font-medium break-words">{parsed.message}</p>
        {meta.length > 0 ? (
          <p className="font-mono text-xs opacity-80">{meta.join(" · ")}</p>
        ) : null}
      </div>
    </StatusBanner>
  );
}
