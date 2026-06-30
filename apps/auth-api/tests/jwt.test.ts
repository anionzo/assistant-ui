import { beforeEach, describe, expect, it, vi } from "vitest";
import { signSessionToken, verifySessionToken } from "../src/services/jwt";

describe("session jwt", () => {
  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", "test-secret");
    vi.stubEnv("JWT_ACCESS_TTL", "3600");
  });

  it("round-trips the session claims", async () => {
    const token = await signSessionToken({
      id: "user-1",
      email: "user@example.com",
      displayName: "Idx User",
      avatarUrl: null,
    });

    await expect(verifySessionToken(token)).resolves.toMatchObject({
      id: "user-1",
      email: "user@example.com",
      displayName: "Idx User",
    });
  });
});
