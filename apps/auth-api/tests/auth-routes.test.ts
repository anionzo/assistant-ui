import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import type { AuthStore, CreateOAuthAccountInput, CreateUserInput, OAuthAccountRecord } from "../src/db/store";
import type { UserRecord } from "../src/db/schema";

class MemoryAuthStore implements AuthStore {
  private users = new Map<string, UserRecord>();
  private oauthAccounts = new Map<string, OAuthAccountRecord>();

  async findUserById(id: string) {
    return this.users.get(id) ?? null;
  }

  async findUserByEmail(email: string) {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async createUser(input: CreateUserInput) {
    const user: UserRecord = {
      id: crypto.randomUUID(),
      email: input.email,
      passwordHash: input.passwordHash ?? null,
      displayName: input.displayName ?? null,
      avatarUrl: input.avatarUrl ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async findOAuthAccount(provider: string, providerAccountId: string) {
    return this.oauthAccounts.get(`${provider}:${providerAccountId}`) ?? null;
  }

  async createOAuthAccount(input: CreateOAuthAccountInput) {
    this.oauthAccounts.set(`${input.provider}:${input.providerAccountId}`, {
      id: crypto.randomUUID(),
      userId: input.userId,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      createdAt: new Date(),
    });
  }
}

describe("auth routes", () => {
  beforeEach(() => {
    vi.stubEnv("JWT_SECRET", "test-secret");
    vi.stubEnv("JWT_ACCESS_TTL", "3600");
  });

  it("supports register -> login -> me", async () => {
    const app = createApp(new MemoryAuthStore());

    const registerResponse = await app.request("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "user@example.com",
        password: "Secret123!",
        displayName: "Idx User",
      }),
    });

    expect(registerResponse.status).toBe(201);
    const registerPayload = await registerResponse.json();
    expect(registerPayload.user).toMatchObject({
      email: "user@example.com",
      displayName: "Idx User",
    });
    expect(registerPayload.accessToken).toEqual(expect.any(String));

    const loginResponse = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "user@example.com",
        password: "Secret123!",
      }),
    });

    expect(loginResponse.status).toBe(200);
    const loginPayload = await loginResponse.json();
    expect(loginPayload.accessToken).toEqual(expect.any(String));

    const meResponse = await app.request("/auth/me", {
      headers: {
        authorization: `Bearer ${loginPayload.accessToken}`,
      },
    });

    expect(meResponse.status).toBe(200);
    await expect(meResponse.json()).resolves.toMatchObject({
      user: {
        email: "user@example.com",
        displayName: "Idx User",
      },
    });
  });
});
