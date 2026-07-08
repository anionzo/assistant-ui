"use client";

import { Button } from "@/components/ui/button";
import {
  isFormCardCustom,
  type FormCardCustom,
} from "@/lib/form-module/form-card-metadata";
import { hydrateFormFromSession } from "@/lib/form-module/activate-form";
import {
  useFormModuleStore,
  useFormModuleStoreApi,
} from "@/lib/form-module/form-module-store";
import { FORM_MODULE_ENABLED } from "@/lib/feature-flags";
import { loadSession } from "@/lib/voice-form/sessions";
import type { ThreadMessage } from "@assistant-ui/react";
import { useAuiState } from "@assistant-ui/react";
import { FileText, Loader2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

type FilledChip = {
  custom: FormCardCustom;
  messageId: string;
};

export function FormQuickSelector() {
  const rawMessages = useAuiState((s) => s.thread.messages);
  const remoteId = useAuiState((s) => s.threadListItem?.remoteId);
  const store = useFormModuleStoreApi();
  const activeFormSessionId = useFormModuleStore((s) => s.binding?.formSessionId);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);

  const filledCards = useMemo(() => {
    const map = new Map<string, FilledChip>();
    const messages = (rawMessages ?? []) as readonly ThreadMessage[];
    // Iterate reverse so most recent filled cards appear first
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i] as ThreadMessage & {
        id?: string;
        metadata?: { custom?: unknown };
      };
      const custom = msg.metadata?.custom;
      if (
        isFormCardCustom(custom) &&
        !map.has(custom.formSessionId)
      ) {
        map.set(custom.formSessionId, {
          custom,
          messageId: msg.id ?? "",
        });
      }
    }
    return Array.from(map.values());
  }, [rawMessages]);

  const handleSelect = useCallback(
    async (chip: FilledChip) => {
      if (!remoteId || busySessionId) return;
      setBusySessionId(chip.custom.formSessionId);
      try {
        const session = await loadSession(chip.custom.formSessionId);
        await hydrateFormFromSession({
          store,
          threadId: remoteId,
          formSessionId: chip.custom.formSessionId,
          cardMessageId: chip.messageId,
          formCode: session.formCode || chip.custom.formCode,
          formName: session.formName || chip.custom.formName,
          fieldValues: session.fieldValues ?? {},
          decision: session.decision || chip.custom.decision,
        });
      } finally {
        setBusySessionId(null);
      }
    },
    [remoteId, busySessionId, store]
  );

  if (!FORM_MODULE_ENABLED || filledCards.length === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 px-1"
      data-slot="form-quick-selector"
    >
      {filledCards.map((chip) => {
        const c = chip.custom;
        const isActive = activeFormSessionId === c.formSessionId;
        const isBusy = busySessionId === c.formSessionId;
        return (
          <Button
            key={c.formSessionId}
            type="button"
            variant={isActive ? "secondary" : "outline"}
            size="sm"
            className="h-7 gap-1.5 rounded-full px-2.5 py-0 text-xs font-normal"
            disabled={isBusy || !!busySessionId}
            onClick={() => void handleSelect(chip)}
          >
            {isBusy ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <FileText className="size-3" />
            )}
            <span className="max-w-[160px] truncate">{c.formName || c.formCode}</span>
            {c.fieldCount > 0 && (
              <span className="text-muted-foreground/70">({c.fieldCount})</span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
