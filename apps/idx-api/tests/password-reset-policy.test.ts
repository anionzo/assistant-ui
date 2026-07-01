import { afterEach, describe, expect, it } from "vitest";
import { isSelfServicePasswordResetEnabled } from "../src/utils/password-reset-policy";

describe("password reset policy", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("enables self-service reset in non-production by default", () => {
    expect(isSelfServicePasswordResetEnabled({ NODE_ENV: "development" })).toBe(true);
  });

  it("disables self-service reset in production by default", () => {
    expect(isSelfServicePasswordResetEnabled({ NODE_ENV: "production" })).toBe(false);
  });

  it("allows explicit override via SELF_SERVICE_PASSWORD_RESET_ENABLED", () => {
    expect(
      isSelfServicePasswordResetEnabled({
        NODE_ENV: "production",
        SELF_SERVICE_PASSWORD_RESET_ENABLED: "true",
      }),
    ).toBe(true);
    expect(
      isSelfServicePasswordResetEnabled({
        NODE_ENV: "development",
        SELF_SERVICE_PASSWORD_RESET_ENABLED: "false",
      }),
    ).toBe(false);
  });
});