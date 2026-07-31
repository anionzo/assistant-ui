import type { ChatModelRunResult } from "@assistant-ui/react";
import { describe, expect, it, vi } from "vitest";
import { createModularRagAdapter, extractLastUserMessage } from "../lib/modular-rag-adapter";

function asAsyncGenerator(
  result: Promise<ChatModelRunResult> | AsyncGenerator<ChatModelRunResult, void, unknown>,
) {
  if (!(result && typeof result === "object" && Symbol.asyncIterator in result)) {
    throw new Error("Expected async generator from adapter.run");
  }
  return result as AsyncGenerator<ChatModelRunResult, void, unknown>;
}

describe("createModularRagAdapter", () => {
  it("falls back to metadata.answer when the stream has no tokens", async () => {
    const sse = [
      'event: metadata\ndata: {"answer":"Xin chào từ metadata","contexts":[]}\n\n',
      "event: done\ndata: [DONE]\n\n",
    ].join("");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(sse, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      ),
    );

    const adapter = createModularRagAdapter("conv-meta");
    const gen = asAsyncGenerator(
      adapter.run({
        messages: [
          {
            id: "1",
            role: "user",
            content: [{ type: "text", text: "hi" }],
            createdAt: new Date(),
          },
        ],
        abortSignal: undefined,
        unstable_threadId: "thread-meta",
      } as never),
    );

    const chunks: ChatModelRunResult[] = [];
    for await (const chunk of gen) chunks.push(chunk);

    const last = chunks.at(-1);
    expect(last?.content).toEqual([
      { type: "text", text: "Xin chào từ metadata" },
    ]);

    vi.unstubAllGlobals();
  });

  it("aborts the previous thread stream when switching threads", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo, init?: RequestInit) => {
      await new Promise<void>((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) return;
        if (signal.aborted) {
          const error = new Error("Aborted");
          error.name = "AbortError";
          reject(error);
          return;
        }
        signal.addEventListener("abort", () => {
          const error = new Error("Aborted");
          error.name = "AbortError";
          reject(error);
        }, { once: true });
      });

      return new Response("data: {\"type\":\"done\"}\n\n", {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    });

    vi.stubGlobal("fetch", fetchMock);

    const adapter = createModularRagAdapter("conv-1");
    const first = asAsyncGenerator(adapter.run({
      messages: [{ id: "1", role: "user", content: [{ type: "text", text: "a" }], createdAt: new Date() }],
      abortSignal: undefined,
      unstable_threadId: "thread-a",
    } as never));

    const pendingFirst = first.next();
    await Promise.resolve();

    const second = asAsyncGenerator(adapter.run({
      messages: [{ id: "2", role: "user", content: [{ type: "text", text: "b" }], createdAt: new Date() }],
      abortSignal: undefined,
      unstable_threadId: "thread-b",
    } as never));
    void second.next();

    await expect(pendingFirst).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });
});

describe("extractLastUserMessage", () => {
  it("sends only the latest user text", () => {
    const messages = [
      { id: "1", role: "user", content: [{ type: "text", text: "cũ" }], createdAt: new Date() },
      { id: "2", role: "assistant", content: [{ type: "text", text: "trả lời" }], createdAt: new Date(), status: { type: "complete", reason: "stop" } },
      { id: "3", role: "user", content: [{ type: "text", text: "mới" }], createdAt: new Date() },
    ];

    expect(extractLastUserMessage(messages as never)).toBe("mới");
  });
});
