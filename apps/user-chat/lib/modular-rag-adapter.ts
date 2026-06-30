import { parseModularRagSse } from "@idx/modular-rag-sdk";
import type { ChatModelAdapter, ThreadMessage } from "@assistant-ui/react";

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

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? `Yêu cầu thất bại (${response.status})`;
  } catch {
    return `Yêu cầu thất bại (${response.status})`;
  }
}

export function createModularRagAdapter(fallbackConversationId: string): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal, unstable_threadId }) {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: extractLastUserMessage(messages),
          conversationId: unstable_threadId || fallbackConversationId,
        }),
        signal: abortSignal,
      });

      if (!response.ok) throw new Error(await readError(response));
      if (!response.body) throw new Error("Gateway không trả về stream");

      let text = "";
      for await (const event of parseModularRagSse(response.body)) {
        if (event.type === "token") {
          text += event.token;
          yield { content: [{ type: "text", text }] };
        } else if (event.type === "error") {
          throw new Error(event.message);
        } else if (event.type === "done") {
          break;
        }
      }
    },
  };
}
