import { describe, expect, it } from "vitest";
import { formatConvLabel } from "../lib/voice-form/sessions";
import type { ConversationStub } from "../lib/voice-form/types";

describe("formatConvLabel", () => {
  const base: ConversationStub = {
    id: "vf-1",
    title: "",
    formCode: "DK01",
    formName: "Đăng ký tạm trú",
    fieldCount: 3,
    decision: "incomplete",
    updatedAt: Date.now(),
  };

  it("prefers custom title over form name", () => {
    expect(formatConvLabel({ ...base, title: "Hồ sơ anh Tuấn" })).toMatch(/^Hồ sơ anh Tuấn/);
  });

  it("falls back to form name when title is empty", () => {
    expect(formatConvLabel(base)).toMatch(/^Đăng ký tạm trú/);
  });
});