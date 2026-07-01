import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { tryVerifySessionToken, verifySessionToken } from "../lib/auth/session";

const encoder = new TextEncoder();

describe("verifySessionToken", () => {
  it("returns the session user from a signed JWT", async () => {
    const token = await new SignJWT({
      email: "user@example.com",
      displayName: "Idx User",
      avatarUrl: null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(encoder.encode("test-secret"));

    await expect(verifySessionToken(token, "test-secret")).resolves.toMatchObject({
      id: "user-1",
      email: "user@example.com",
      displayName: "Idx User",
    });
  });

  it("returns null when the signature does not match", async () => {
    const token = await new SignJWT({ email: "user@example.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(encoder.encode("old-secret"));

    await expect(tryVerifySessionToken(token, "new-secret")).resolves.toBeNull();
  });
});
