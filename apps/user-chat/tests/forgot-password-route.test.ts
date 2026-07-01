import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/auth/forgot-password/route";

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.stubEnv("IDX_API_URL", "http://localhost:4000");
    vi.stubEnv("IDX_SERVICE_SECRET", "service-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns 403 when self-service reset is disabled", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SELF_SERVICE_PASSWORD_RESET_ENABLED", "false");

    const response = await POST(
      new Request("http://localhost:3001/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("disabled"),
    });
  });
});