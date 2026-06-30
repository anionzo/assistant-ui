import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as documentsGet } from "../app/api/documents/[...slug]/route";
import { GET as formsGet } from "../app/api/forms/route";
import { GET as healthGet } from "../app/api/health/route";

describe("admin BFF", () => {
  beforeEach(() => {
    vi.stubEnv("MODULAR_RAG_GATEWAY_URL", "http://localhost:8030");
    vi.stubEnv("ADMIN_API_KEY", "admin-secret");
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

  it("proxies document collections to gateway compat path", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ collections: [{ id: "c1" }] }), { status: 200 }),
    );

    const response = await documentsGet(
      new Request("http://localhost:3002/api/documents/collections"),
      { params: Promise.resolve({ slug: ["collections"] }) },
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8030/document-processing/compat/collections",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "X-API-Key": "admin-secret" }),
      }),
    );
  });

  it("proxies forms list to gateway /forms", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ forms: [] }), { status: 200 }),
    );

    const response = await formsGet(new Request("http://localhost:3002/api/forms"));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8030/forms",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "X-API-Key": "admin-secret" }),
      }),
    );
  });

  it("returns configuration_error when ADMIN_API_KEY is missing", async () => {
    vi.stubEnv("ADMIN_API_KEY", "");

    const response = await documentsGet(
      new Request("http://localhost:3002/api/documents/collections"),
      { params: Promise.resolve({ slug: ["collections"] }) },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ code: "configuration_error" });
  });
});