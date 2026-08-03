import { describe, expect, it } from "vitest";
import { buildAssistantMetadata, extractVoiceAnswer } from "@/lib/voice-turn";

describe("voice-turn helpers", () => {
  it("extracts trimmed answer from metadata", () => {
    expect(extractVoiceAnswer({ conversation_id: "c1", answer: "  Xin chào  " })).toBe(
      "Xin chào",
    );
    expect(extractVoiceAnswer({ conversation_id: "c1", answer: "   " })).toBe("");
  });

  it("maps voice metadata contexts into assistant custom fields", () => {
    const metadata = buildAssistantMetadata({
      conversation_id: "c1",
      answer: "Trả lời",
      contexts: [{ id: "1", text: "Nguồn", score: 0.9 }],
      citations: [{ id: "cite-1" }],
    });

    expect(metadata).toEqual({
      custom: {
        ragContexts: [{ id: "1", text: "Nguồn", score: 0.9 }],
        ragCitations: [{ id: "cite-1" }],
      },
    });
  });
});