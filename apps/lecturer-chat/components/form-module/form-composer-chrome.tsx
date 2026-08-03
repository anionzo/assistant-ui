"use client";

import { Button } from "@/components/ui/button";
import { FORM_MODULE_ENABLED } from "@/lib/feature-flags";
import { useFormModuleStore, useFormModuleActions } from "@/lib/form-module/form-module-store";
import { FileText, X } from "lucide-react";

export function FormComposerChrome() {
  const mode = useFormModuleStore((s) => s.mode);
  const binding = useFormModuleStore((s) => s.binding);
  const fieldValues = useFormModuleStore((s) => s.fieldValues);
  const schema = useFormModuleStore((s) => s.schema);
  const { deactivate } = useFormModuleActions();

  if (!FORM_MODULE_ENABLED || mode !== "form-fill" || !binding) return null;

  let filled = 0;
  let total = 0;
  for (const f of schema?.need_to_fill ?? []) {
    if (!f?.key || !f.required) continue;
    total++;
    const v = fieldValues[f.key];
    if (!(v === undefined || v === null || v === "")) filled++;
  }

  return (
    <div className="border-primary/30 bg-primary/5 mb-2 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <FileText className="text-primary size-4 shrink-0" />
        <span className="truncate font-medium">Đang điền: {binding.formName}</span>
        {total > 0 && (
          <span className="text-muted-foreground shrink-0 text-xs">
            {filled}/{total}
          </span>
        )}
      </div>
      <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" onClick={deactivate}>
        <X className="size-4" />
      </Button>
    </div>
  );
}