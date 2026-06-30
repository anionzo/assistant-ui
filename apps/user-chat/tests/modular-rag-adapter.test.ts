import { describe, expect, it } from "vitest";
import { extractLastUserMessage } from "../lib/modular-rag-adapter";

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
