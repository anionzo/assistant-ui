import { describe, expect, it } from "vitest";
import { isSelfServicePasswordResetEnabled } from "../lib/server/password-reset-policy";

describe("password reset policy", () => {
  it("disables self-service reset in production by default", () => {
    expect(isSelfServicePasswordResetEnabled({ NODE_ENV: "production" })).toBe(false);
  });

  it("enables self-service reset in development by default", () => {
    expect(isSelfServicePasswordResetEnabled({ NODE_ENV: "development" })).toBe(true);
  });
});