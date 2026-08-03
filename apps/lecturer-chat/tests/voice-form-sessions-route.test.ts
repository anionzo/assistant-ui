import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listSessions, POST as createSession } from "../app/api/voice-form/sessions/route";
import * as sessionResolve from "../lib/auth/session-resolve";
import { mockResolvedServerConfig } from "./helpers/resolved-config";

const sessionUser = {
  id: "user-abc",
  email: "user@example.com",
  displayName: "User",
  avatarUrl: null,
};

describe("/api/voice-form/sessions", () => {
  beforeEach(() => {
    vi.stubEnv("IDX_API_URL", "http://localhost:4000");
    vi.stubEnv("IDX_SERVICE_SECRET", "service-secret");
    mockResolvedServerConfig({ tenantId: "tenant-from-db" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns empty list for guest when auth is not required", async () => {
    vi.spyOn(sessionResolve, "resolveSession").mockResolvedValue(null);

    const response = await listSessions(new Request("http://localhost:3001/api/voice-form/sessions"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ sessions: [] });
  });

  it("returns 401 for list without session when auth is required", async () => {
    vi.stubEnv("AUTH_REQUIRED", "true");
    vi.stubEnv("JWT_SECRET", "test-secret");
    mockResolvedServerConfig({ authRequired: true });
    vi.spyOn(sessionResolve, "resolveSession").mockResolvedValue(null);

    const response = await listSessions(new Request("http://localhost:3001/api/voice-form/sessions"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "Missing session cookie" });
  });

  it("proxies list to idx-api with bearer token and tenant from app_config", async () => {
    vi.spyOn(sessionResolve, "resolveSession").mockResolvedValue({
      user: sessionUser,
      accessToken: "access-token",
      refreshed: false,
    });

    const idxFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { sessions: [{ id: "vf-1", formCode: "DK01", fieldCount: 0, updatedAt: new Date().toISOString() }] },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", idxFetch);

    const response = await listSessions(new Request("http://localhost:3001/api/voice-form/sessions"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      sessions: [{ id: "vf-1", formCode: "DK01" }],
    });

    const [url, init] = idxFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("http://localhost:4000/voice-form/sessions");
    expect(url).toContain("tenantId=tenant-from-db");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer access-token");
  });

  it("creates session via idx-api with resolved tenantId", async () => {
    vi.spyOn(sessionResolve, "resolveSession").mockResolvedValue({
      user: sessionUser,
      accessToken: "access-token",
      refreshed: false,
    });

    const idxFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            session: {
              id: "vf-new",
              tenantId: "tenant-from-db",
              formCode: "",
              formName: "",
              fieldCount: 0,
              updatedAt: new Date().toISOString(),
            },
          },
        }),
        { status: 201 },
      ),
    );
    vi.stubGlobal("fetch", idxFetch);

    const response = await createSession(
      new Request("http://localhost:3001/api/voice-form/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(201);
    const [, init] = idxFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({ tenantId: "tenant-from-db" });
  });
});