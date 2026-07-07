"use client";

import { Button } from "@/components/ui/button";
import { FORM_MODULE_ENABLED } from "@/lib/feature-flags";
import { useFormModuleStore, useFormModuleActions } from "@/lib/form-module/form-module-store";
import {
  outputDownloadUrl,
  renderDocx,
  renderPreview,
} from "@/lib/voice-form/api";
import type { FormField } from "@/lib/voice-form/types";
import { cn } from "@/lib/utils";
import { useT } from "@idx/i18n";
import { Check, CloudOff, FileDown, Loader2, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const BOOL_TYPES = new Set(["bool", "boolean", "checkbox", "yesno"]);
const PREVIEW_DEBOUNCE_MS = 2500;

function displayValue(
  field: FormField | null,
  raw: unknown,
  tr: (key: string) => string,
): string {
  if (raw === undefined || raw === null || raw === "") return "—";
  const ft = String(field?.field_type || "").toLowerCase();
  if (BOOL_TYPES.has(ft) || typeof raw === "boolean") {
    if (raw === true || raw === "true") return tr("common.yes");
    if (raw === false || raw === "false") return tr("common.no");
  }
  return String(raw);
}

function basename(path: string): string {
  if (!path) return "";
  return (path.split(/[\\/]/).pop() || "").split("?")[0];
}

export function FormArtifactPanel() {
  const t = useT();
  const { deactivate } = useFormModuleActions();
  const mode = useFormModuleStore((s) => s.mode);
  const binding = useFormModuleStore((s) => s.binding);
  const schema = useFormModuleStore((s) => s.schema);
  const fieldValues = useFormModuleStore((s) => s.fieldValues);
  const nextField = useFormModuleStore((s) => s.nextField);
  const invalidFields = useFormModuleStore((s) => s.invalidFields);
  const decision = useFormModuleStore((s) => s.decision);
  const busy = useFormModuleStore((s) => s.busy);
  const saveStatus = useFormModuleStore((s) => s.saveStatus);

  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [docBusy, setDocBusy] = useState(false);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visible = FORM_MODULE_ENABLED && mode === "form-fill" && binding;

  const schedulePreview = useCallback(() => {
    if (!binding?.formCode || !binding.formSessionId) {
      setPreviewHtml("");
      return;
    }
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const data = await renderPreview(binding.formCode, fieldValues, binding.formSessionId);
        setPreviewHtml(data.html || "");
      } catch {
        setPreviewHtml("");
      } finally {
        setPreviewLoading(false);
      }
    }, PREVIEW_DEBOUNCE_MS);
  }, [binding, fieldValues]);

  useEffect(() => {
    if (visible) schedulePreview();
  }, [visible, fieldValues, schedulePreview]);

  const handleDownload = async () => {
    if (!binding || docBusy) return;
    setDocBusy(true);
    try {
      const data = await renderDocx(binding.formCode, fieldValues, binding.formSessionId);
      const file = basename(data.output_file || data.file_path || "");
      if (!file) throw new Error("no file");
      const a = document.createElement("a");
      a.href = outputDownloadUrl(file);
      a.download = file;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setDocBusy(false);
    }
  };

  if (!visible || !binding) return null;

  const fields = schema?.need_to_fill ?? [];
  let filled = 0;
  let total = 0;
  for (const f of fields) {
    if (!f?.key || !f.required) continue;
    total++;
    const v = fieldValues[f.key];
    const has = !(v === undefined || v === null || v === "");
    const invalid = Object.hasOwn(invalidFields, f.key);
    if (has && !invalid) filled++;
  }

  return (
    <aside className="border-border/60 flex w-full min-w-[300px] max-w-md shrink-0 flex-col border-l bg-background lg:w-96">
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{binding.formName || binding.formCode}</p>
          <p className="text-muted-foreground text-xs">
            {total ? `${filled}/${total} mục bắt buộc` : "Biểu mẫu"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {saveStatus === "saving" && <Loader2 className="text-muted-foreground size-4 animate-spin" />}
          {saveStatus === "saved" && <Check className="size-4 text-green-600" />}
          {saveStatus === "error" && <CloudOff className="text-destructive size-4" />}
          <Button type="button" variant="ghost" size="icon" onClick={deactivate} aria-label="Đóng biểu mẫu">
            <X className="size-4" />
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {fields.map((f) => {
            if (!f?.key) return null;
            const rawVal = fieldValues[f.key];
            const isInvalid = Object.hasOwn(invalidFields, f.key);
            const isNext = nextField === f.key;
            return (
              <div
                key={f.key}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm",
                  isInvalid && "border-destructive/50 bg-destructive/5",
                  isNext && "border-primary/50 bg-primary/5",
                )}
              >
                <p className="text-xs font-medium">
                  {f.label || f.key}
                  {f.required && <span className="text-destructive"> *</span>}
                </p>
                <p className="mt-1">{displayValue(f, rawVal, t)}</p>
                {isInvalid && (
                  <p className="text-destructive mt-1 text-xs">{invalidFields[f.key]}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs">Xem trước</span>
          {previewLoading && <RefreshCw className="size-3.5 animate-spin" />}
        </div>
        <div className="prose prose-sm dark:prose-invert mt-2 max-h-48 overflow-y-auto text-sm">
          {previewHtml ? (
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          ) : (
            <p className="text-muted-foreground">{previewLoading ? "Đang tải..." : "Chưa có xem trước"}</p>
          )}
        </div>
      </div>

      <footer className="border-t p-3">
        <Button
          type="button"
          className="w-full"
          variant="outline"
          disabled={docBusy || busy || !["ready", "confirm"].includes(decision)}
          onClick={() => void handleDownload()}
        >
          {docBusy ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
          Tải DOCX
        </Button>
      </footer>
    </aside>
  );
}