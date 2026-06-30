import { parseModularRagSse, type StreamMetadata } from "@idx/modular-rag-sdk";
import type { ChatModelAdapter, ThreadMessage } from "@assistant-ui/react";
import { buildRagMessageCustom } from "@/lib/rag-metadata";
import type { RuntimeChatOptions } from "@/lib/runtime-chat-options";

export function extractLastUserMessage(messages: readonly ThreadMessage[]): string {
  const message = [...messages].reverse().find((item) => item.role === "user");
  if (!message) throw new Error("Không tìm thấy tin nhắn người dùng");

  const text = message.content
    .filter((part): part is Extract<(typeof message.content)[number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

  if (!text) throw new Error("Tin nhắn không được để trống");
  return text;
}

function resolveConversationId(
  unstableThreadId: string | undefined,
  fallbackConversationId: string,
  getConversationId: (threadId: string) => string | undefined,
) {
  if (!unstableThreadId) return fallbackConversationId;
  return getConversationId(unstableThreadId) ?? unstableThreadId;
}

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? `Yêu cầu thất bại (${response.status})`;
  } catch {
    return `Yêu cầu thất bại (${response.status})`;
  }
}

export function createModularRagAdapter(
  fallbackConversationId: string,
  getConversationId: (threadId: string) => string | undefined = () => undefined,
  getRuntimeOptions: () => RuntimeChatOptions = () => ({}),
): ChatModelAdapter {
  let activeThreadId: string | undefined;
  let activeAbortController: AbortController | null = null;

  return {
    async *run({ messages, abortSignal, unstable_threadId }) {
      // Abort previous thread's SSE when switching threads
      if (activeThreadId && activeThreadId !== unstable_threadId && activeAbortController) {
        activeAbortController.abort();
      }

      activeThreadId = unstable_threadId;
      const ourController = new AbortController();
      activeAbortController = ourController;

      // Combine library signal (Stop button) with our signal (thread switch)
      const combinedSignal = abortSignal
        ? combineSignals(abortSignal, ourController.signal)
        : ourController.signal;

      const conversationId = resolveConversationId(
        unstable_threadId,
        fallbackConversationId,
        getConversationId,
      );

      const runtimeOptions = getRuntimeOptions();
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: extractLastUserMessage(messages),
          conversationId,
          ...(runtimeOptions.pipeline ? { pipeline: runtimeOptions.pipeline } : {}),
          ...(runtimeOptions.topK != null ? { topK: runtimeOptions.topK } : {}),
        }),
        signal: combinedSignal,
      });

      if (!response.ok) throw new Error(await readError(response));
      if (!response.body) throw new Error("Gateway không trả về stream");

      let text = "";
      let metadata: StreamMetadata | null = null;

      try {
        for await (const event of parseModularRagSse(response.body)) {
          if (event.type === "token") {
            text += event.token;
            yield { content: [{ type: "text", text }] };
          } else if (event.type === "metadata") {
            metadata = event.metadata;
          } else if (event.type === "error") {
            throw new Error(event.message);
          } else if (event.type === "done") {
            const custom = buildRagMessageCustom(metadata);
            if (custom) {
              yield {
                content: [{ type: "text", text }],
                metadata: { custom },
              };
            }
            break;
          }
        }
      } finally {
        if (activeAbortController === ourController) {
          activeAbortController = null;
        }
      }
    },
  };
}

function combineSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (a.aborted || b.aborted) return AbortSignal.abort();
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  a.addEventListener("abort", onAbort, { once: true });
  b.addEventListener("abort", onAbort, { once: true });
  return controller.signal;
}
