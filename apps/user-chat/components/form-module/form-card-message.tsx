"use client";

import { Button } from "@/components/ui/button";
import {
  buildFormCardCustom,
  countFilledFields,
  isFormCardCustom,
  type FormCardCustom,
} from "@/lib/form-module/form-card-metadata";
import { hydrateFormFromSession } from "@/lib/form-module/activate-form";
import { useFormModuleStore, useFormModuleStoreApi } from "@/lib/form-module/form-module-store";
import { loadSession } from "@/lib/voice-form/sessions";
import { useAuiState } from "@assistant-ui/react";
import { FileText, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

export function FormCardMessage({ custom }: { custom: FormCardCustom }) {
  const remoteId = useAuiState((s) => s.threadListItem?.remoteId);
  const messageId = useAuiState((s) => s.message?.id);
  const store = useFormModuleStoreApi();
  const activeSession = useFormModuleStore((s) => s.binding?.formSessionId);
  const [busy, setBusy] = useState(false);
  const isActive = activeSession === custom.formSessionId;

  const openForm = useCallback(async () => {
    if (!remoteId || !messageId || busy) return;
    setBusy(true);
    try {
      const session = await loadSession(custom.formSessionId);
      await hydrateFormFromSession({
        store,
        threadId: remoteId,
        formSessionId: custom.formSessionId,
        cardMessageId: messageId,
        formCode: session.formCode || custom.formCode,
        formName: session.formName || custom.formName,
        fieldValues: session.fieldValues ?? {},
        decision: session.decision || custom.decision,
      });
    } finally {
      setBusy(false);
    }
  }, [remoteId, messageId, busy, custom, store]);

  const progress =
    custom.fieldCount > 0
      ? `${custom.fieldCount} mục đã điền`
      : "Chưa điền mục nào";

  return (
    <div
      className={`mt-2 rounded-xl border px-4 py-3 ${
        isActive ? "border-primary/50 bg-primary/5" : "border-border/60 bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <FileText className="text-primary mt-0.5 size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{custom.formName || custom.formCode}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {progress}
            {custom.status === "completed" ? " · Hoàn tất" : ""}
            {custom.status === "paused" ? " · Tạm dừng" : ""}
          </p>
        </div>
        <Button type="button" size="sm" variant={isActive ? "secondary" : "outline"} disabled={busy} onClick={() => void openForm()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : isActive ? "Đang mở" : "Mở"}
        </Button>
      </div>
    </div>
  );
}

export function FormCardFromMetadata() {
  const custom = useAuiState(
    (s) => (s.message?.metadata?.custom as unknown) ?? null,
  );
  if (!isFormCardCustom(custom)) return null;
  return <FormCardMessage custom={custom} />;
}

export function syncFormCardFieldCount(
  custom: FormCardCustom,
  fieldValues: Record<string, unknown>,
  decision: string,
) {
  return buildFormCardCustom({
    formSessionId: custom.formSessionId,
    formCode: custom.formCode,
    formName: custom.formName,
    status: custom.status,
    fieldValues,
    decision,
  });
}

export { countFilledFields };