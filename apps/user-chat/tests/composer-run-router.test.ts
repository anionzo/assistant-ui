import type { ChatModelAdapter, ChatModelRunResult } from "@assistant-ui/react";
import { describe, expect, it, vi } from "vitest";
import { createChatComposerAdapter } from "@/lib/form-module/composer-run-router";
import type { FormModuleStore } from "@/lib/form-module/form-module-store";

function mockStore(mode: "rag" | "form-fill", threadId?: string): FormModuleStore {
  const state = {
    mode,
    threadId: threadId ?? null,
    binding:
      mode === "form-fill" && threadId
        ? {
            threadId,
            formSessionId: "sess-1",
            cardMessageId: "card-1",
            formCode: "DK01",
            formName: "Test form",
          }
        : null,
    fieldValues: {},
    schema: null,
    nextField: null,
    invalidFields: {},
    decision: "incomplete",
    busy: false,
    saveStatus: "idle" as const,
  };
  return {
    getSnapshot: () => state,
    subscribe: () => () => true,
    apply: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
    clearOnThreadSwitch: vi.fn(),
    setBusy: vi.fn(),
    setSaveStatus: vi.fn(),
    updateCardStatus: vi.fn(),
  };
}

describe("createChatComposerAdapter", () => {
  it("routes to postFill when form-lock matches active remote thread id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ voice_prompt: "OK", field_values: { name: "A" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const ragRun = vi.fn();
    const ragAdapter: ChatModelAdapter = {
      run: ragRun as ChatModelAdapter["run"],
    };

    const adapter = createChatComposerAdapter(
      ragAdapter,
      () => mockStore("form-fill", "remote-thread-1"),
      () => "remote-thread-1",
    );

    const gen = adapter.run({
      messages: [
        { id: "1", role: "user", content: [{ type: "text", text: "Nguyễn Văn A" }], createdAt: new Date() },
      ],
      abortSignal: undefined as never,
      runConfig: {},
      context: {},
      unstable_getMessage: () => {
        throw new Error("unused");
      },
      unstable_threadId: "local-internal-id",
    } as never) as AsyncGenerator<ChatModelRunResult, void>;

    const first = await gen.next();
    expect(first.value).toMatchObject({ content: [{ type: "text", text: "OK" }] });
    expect(fetchMock).toHaveBeenCalled();
    expect(ragRun).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("falls back to RAG when active thread id differs from binding", async () => {
    async function* ragGen() {
      yield { content: [{ type: "text" as const, text: "rag" }] };
    }
    const ragAdapter: ChatModelAdapter = { run: () => ragGen() };

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const adapter = createChatComposerAdapter(
      ragAdapter,
      () => mockStore("form-fill", "thread-a"),
      () => "thread-b",
    );

    const gen = adapter.run({
      messages: [
        { id: "1", role: "user", content: [{ type: "text", text: "hi" }], createdAt: new Date() },
      ],
      abortSignal: undefined as never,
      runConfig: {},
      context: {},
      unstable_getMessage: () => {
        throw new Error("unused");
      },
      unstable_threadId: "thread-a",
    } as never) as AsyncGenerator<ChatModelRunResult, void>;

    await gen.next();
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});