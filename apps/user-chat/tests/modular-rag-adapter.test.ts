import { describe, expect, it, vi } from "vitest";
import { createModularRagAdapter, extractLastUserMessage } from "../lib/modular-rag-adapter";

describe("createModularRagAdapter", () => {
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
    const first = adapter.run({
      messages: [{ id: "1", role: "user", content: [{ type: "text", text: "a" }], createdAt: new Date() }],
      abortSignal: undefined,
      unstable_threadId: "thread-a",
    } as never);

    const pendingFirst = first.next();
    await Promise.resolve();

    const second = adapter.run({
      messages: [{ id: "2", role: "user", content: [{ type: "text", text: "b" }], createdAt: new Date() }],
      abortSignal: undefined,
      unstable_threadId: "thread-b",
    } as never);
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
