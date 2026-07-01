import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/services/password";

describe("password hashing", () => {
  it("hashes and verifies a password", async () => {
    const passwordHash = await hashPassword("Secret123!");

    expect(passwordHash).not.toBe("Secret123!");
    await expect(verifyPassword("Secret123!", passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", passwordHash)).resolves.toBe(false);
  });
});
