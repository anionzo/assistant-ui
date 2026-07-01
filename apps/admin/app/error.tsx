"use client";

import { useT } from "@idx/i18n";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-medium text-destructive">{t("errors.title")}</p>
      <p className="text-xs text-muted-foreground max-w-md">{error.message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
      >
        {t("common.tryAgain")}
      </button>
    </div>
  );
}