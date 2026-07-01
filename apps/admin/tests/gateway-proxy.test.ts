import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as documentsGet } from "../app/api/documents/[...slug]/route";
import { GET as formsGet } from "../app/api/forms/route";
import { GET as healthGet } from "../app/api/health/route";
import { P } from "../lib/auth/permissions";
import * as sessionResolve from "../lib/auth/session-resolve";
import { IDX_SERVICE_AUTH_HEADER } from "../lib/server/gateway-proxy";

const adminSession = {
  user: {
    id: "admin-1",
    email: "admin@example.com",
    displayName: "Admin",
    avatarUrl: null,
    roleIds: [2],
    permissionIds: [
      P.COLLECTIONS_READ,
      P.FORMS_READ,
      P.FORMS_CREATE,
      P.DOCUMENTS_UPLOAD,
      P.FORMS_SEARCH,
    ],
  },
  accessToken: "admin-access-token",
  refreshed: false,
};

describe("admin BFF", () => {
  beforeEach(() => {
    vi.stubEnv("IDX_API_URL", "http://localhost:4000");
    vi.stubEnv("IDX_SERVICE_SECRET", "service-secret");
    vi.spyOn(sessionResolve, "resolveSession").mockResolvedValue(adminSession);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns health", async () => {
    const response = await healthGet();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ok", app: "idx-admin" });
  });

  it("proxies document collections through idx-api rag routes", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ collections: [{ id: "c1" }] }), { status: 200 }),
    );

    const response = await documentsGet(
      new Request("http://localhost:3002/api/documents/collections"),
      { params: Promise.resolve({ slug: ["collections"] }) },
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/rag/admin/documents/collections",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          [IDX_SERVICE_AUTH_HEADER]: "service-secret",
          Authorization: "Bearer admin-access-token",
        }),
      }),
    );
    const forwardedHeaders = new Headers(fetchMock.mock.calls[0]?.[1]?.headers as HeadersInit);
    expect(forwardedHeaders.get("X-API-Key")).toBeNull();
  });

  it("proxies forms list through idx-api rag routes", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ forms: [] }), { status: 200 }),
    );

    const response = await formsGet(new Request("http://localhost:3002/api/forms"));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/rag/admin/forms",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          [IDX_SERVICE_AUTH_HEADER]: "service-secret",
          Authorization: "Bearer admin-access-token",
        }),
      }),
    );
  });

  it("returns configuration_error when IDX_SERVICE_SECRET is missing", async () => {
    vi.stubEnv("IDX_SERVICE_SECRET", "");

    const response = await documentsGet(
      new Request("http://localhost:3002/api/documents/collections"),
      { params: Promise.resolve({ slug: ["collections"] }) },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ code: "configuration_error" });
  });
});