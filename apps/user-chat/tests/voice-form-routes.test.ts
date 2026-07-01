import { describe, expect, it } from "vitest";
import { voiceFormPath } from "../lib/voice-form/routes";

describe("voiceFormPath", () => {
  it("returns index path without session id", () => {
    expect(voiceFormPath()).toBe("/voice-form");
    expect(voiceFormPath(undefined)).toBe("/voice-form");
  });

  it("returns session path with encoded id", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(voiceFormPath(id)).toBe(`/voice-form/${encodeURIComponent(id)}`);
  });
});