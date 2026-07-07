import type { ChatModelAdapter, ChatModelRunResult, ThreadMessage } from "@assistant-ui/react";
import { extractLastUserMessage } from "@/lib/modular-rag-adapter";
import { postFill } from "@/lib/voice-form/api";
import type { FormModuleStore } from "@/lib/form-module/form-module-store";
import { extractAssistantText, processFormFillTurn } from "@/lib/form-module/process-form-fill-turn";
import { FORM_MODULE_ENABLED, FORM_FILL_VIA_CHAT_ENABLED } from "@/lib/feature-flags";

async function* streamRagAdapter(
  ragAdapter: ChatModelAdapter,
  options: Parameters<NonNullable<ChatModelAdapter["run"]>>[0],
): AsyncGenerator<ChatModelRunResult, void> {
  const run = ragAdapter.run(options);
  if (run && typeof (run as AsyncGenerator)[Symbol.asyncIterator] === "function") {
    yield* run as AsyncGenerator<ChatModelRunResult, void>;
    return;
  }
  yield (await run) as ChatModelRunResult;
}

export function createChatComposerAdapter(
  ragAdapter: ChatModelAdapter,
  getStore: () => FormModuleStore,
  /** Synced to threadListItem.remoteId — must match binding.threadId */
  getActiveThreadId: () => string | undefined,
): ChatModelAdapter {
  return {
    async *run(options) {
      const store = getStore();
      const snap = store.getSnapshot();
      const activeThreadId = getActiveThreadId();

      // Tách luồng form-fill (gửi để điền form) và normal chat (RAG).
      // Code form-fill đầy đủ được giữ lại, chỉ active khi cả 2 flags + mode match.
      // Mặc định FORM_FILL_VIA_CHAT_ENABLED = false → chat luôn normal.
      if (
        FORM_MODULE_ENABLED &&
        FORM_FILL_VIA_CHAT_ENABLED &&
        snap.mode === "form-fill" &&
        snap.binding &&
        activeThreadId &&
        snap.binding.threadId === activeThreadId
      ) {
        const text = extractLastUserMessage(options.messages);
        const binding = snap.binding;
        store.setBusy(true);

        try {
          const response = await postFill(binding.formSessionId, {
            text,
            form_code: binding.formCode,
            field_values: JSON.stringify(snap.fieldValues),
            history: JSON.stringify([]),
          });

          await processFormFillTurn({ store, binding, response });

          const assistantText = extractAssistantText(response);
          yield {
            content: [
              {
                type: "text" as const,
                text: assistantText || "Đã cập nhật biểu mẫu.",
              },
            ],
          };
        } catch (err) {
          store.setBusy(false);
          throw err;
        }
        return;
      }

      // Luồng normal chat
      yield* streamRagAdapter(ragAdapter, options);
    },
  };
}

export function getThreadHeadMessageId(messages: readonly ThreadMessage[]): string | null {
  const last = messages.at(-1);
  return last?.id ?? null;
}