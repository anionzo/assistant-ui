import { describe, expect, it } from "vitest";
import { scopedConversationId } from "../lib/server/conversation-id";

describe("scopedConversationId", () => {
  it("prefixes bare thread uuid with userId", () => {
    expect(scopedConversationId("user-1", "thread-abc")).toBe("user-1:thread-abc");
  });

  it("keeps an already scoped conversation id", () => {
    expect(scopedConversationId("user-1", "user-1:thread-abc")).toBe("user-1:thread-abc");
  });
});