import { afterEach, describe, expect, it, vi } from "vitest";
import { sendPasswordResetEmail } from "../src/services/reset-email";

describe("sendPasswordResetEmail", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("returns dev token when no webhook is configured", async () => {
    process.env.NODE_ENV = "development";
    process.env.FRONTEND_URL = "http://localhost:3001";
    delete process.env.RESET_PASSWORD_WEBHOOK_URL;

    const result = await sendPasswordResetEmail("user@example.com", "reset-token-123");

    expect(result.sent).toBe(false);
    expect(result.devToken).toBe("reset-token-123");
    expect(result.resetUrl).toContain("/dat-lai-mat-khau?token=reset-token-123");
  });
});