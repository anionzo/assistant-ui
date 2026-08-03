"use client";

import { useI18n, type Locale } from "@idx/i18n";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ value: Locale; label: string }> = [
  { value: "vi", label: "VI" },
  { value: "en", label: "EN" },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-border bg-background p-0.5 text-xs font-medium",
        className,
      )}
      role="group"
      aria-label={t("common.language")}
    >
      {OPTIONS.map((option) => {
        const active = locale === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              "min-w-9 rounded-md px-2 py-1 transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            aria-pressed={active}
            onClick={() => void setLocale(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}