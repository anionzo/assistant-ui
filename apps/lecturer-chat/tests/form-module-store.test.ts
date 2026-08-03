import { describe, expect, it } from "vitest";
import { extractAssistantText } from "@/lib/form-module/process-form-fill-turn";
import type { FillResponse } from "@/lib/voice-form/types";

describe("form module helpers", () => {
  it("extractAssistantText prefers voice_prompt", () => {
    const response: FillResponse = {
      voice_prompt: "Nhập CCCD",
      answer: "other",
      transcript: "t",
    };
    expect(extractAssistantText(response)).toBe("Nhập CCCD");
  });
});