"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { activateFormFromSelection } from "@/lib/form-module/activate-form";
import { getThreadHeadMessageId } from "@/lib/form-module/composer-run-router";
import { buildFormCardCustom } from "@/lib/form-module/form-card-metadata";
import { useFormModuleStore, useFormModuleStoreApi } from "@/lib/form-module/form-module-store";
import { loadFormList } from "@/lib/voice-form/api";
import type { FormSummary } from "@/lib/voice-form/types";
import { useAui, useAuiState } from "@assistant-ui/react";
import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

type FormPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
};

export function FormPickerDialog({ open, onOpenChange, disabled }: FormPickerDialogProps) {
  const titleId = useId();
  const aui = useAui();
  const remoteId = useAuiState((s) => s.threadListItem?.remoteId);
  const messages = useAuiState((s) => s.thread.messages);
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const store = useFormModuleStoreApi();
  const busy = useFormModuleStore((s) => s.busy);

  const [forms, setForms] = useState<FormSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void loadFormList()
      .then(setForms)
      .finally(() => setLoading(false));
  }, [open]);

  const appendFormCard = useCallback(
    (card: ReturnType<typeof buildFormCardCustom>, intro: string) => {
      aui.thread().append({
        role: "assistant",
        content: [{ type: "text", text: intro }],
        metadata: { custom: card },
        startRun: false,
      });
      return card.formSessionId;
    },
    [aui],
  );

  const pickForm = useCallback(
    async (form: FormSummary) => {
      if (activating) return;
      setActivating(true);
      try {
        let tid = remoteId;
        if (!tid) {
          // For new chats without remoteId yet, initialize/create the thread first
          const init = await aui.threadListItem().initialize();
          tid = init.remoteId;
        }
        if (!tid) {
          throw new Error("Không thể tạo thread để chọn biểu mẫu");
        }
        const anchorMessageId = getThreadHeadMessageId(messages);
        await activateFormFromSelection({
          store,
          threadId: tid,
          anchorMessageId,
          form,
          appendFormCard,
        });
        onOpenChange(false);
      } finally {
        setActivating(false);
      }
    },
    [remoteId, activating, messages, store, appendFormCard, onOpenChange, aui],
  );

  const blocked =
    disabled || isRunning || busy;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-background w-full max-w-md rounded-xl border p-4 shadow-lg"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id={titleId} className="text-sm font-semibold">
            Chọn biểu mẫu
          </h2>
          <Button type="button" variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="size-4" />
          </Button>
        </div>
        <Input
          type="search"
          placeholder="Tìm biểu mẫu..."
          value={search}
          disabled={blocked}
          onChange={(e) => {
            const q = e.target.value;
            setSearch(q);
            void loadFormList(q.trim() || undefined).then(setForms);
          }}
        />
        <div className="mt-3 max-h-64 overflow-y-auto">
          {loading && (
            <p className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
              <Loader2 className="size-4 animate-spin" /> Đang tải...
            </p>
          )}
          {!loading && forms.length === 0 && (
            <p className="text-muted-foreground py-4 text-sm">Không có biểu mẫu.</p>
          )}
          <ul className="space-y-1">
            {forms.map((f) => (
              <li key={f.form_code}>
                <button
                  type="button"
                  disabled={blocked || activating}
                  className="hover:bg-muted w-full rounded-lg px-3 py-2 text-left text-sm disabled:opacity-50"
                  onClick={() => void pickForm(f)}
                >
                  <span className="font-medium">{f.form_name}</span>
                  <span className="text-muted-foreground block text-xs">{f.form_code}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}