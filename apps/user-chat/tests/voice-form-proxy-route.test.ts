import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/api/voice-form/proxy/[[...slug]]/route";
import { IDX_SERVICE_AUTH_HEADER } from "../lib/server/idx-api-rag";
import { mockResolvedServerConfig } from "./helpers/resolved-config";

describe("GET /api/voice-form/proxy", () => {
  beforeEach(() => {
    vi.stubEnv("IDX_API_URL", "http://localhost:4000");
    vi.stubEnv("IDX_SERVICE_SECRET", "service-secret");
    mockResolvedServerConfig();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("proxies the forms list root without exposing gateway API keys", async () => {
    const idxFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ forms: [{ form_code: "demo", form_name: "Demo" }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", idxFetch);

    const response = await GET(
      new Request("http://localhost:3001/api/voice-form/proxy"),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(200);
    const [url, init] = idxFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/rag/forms");
    const headers = new Headers(init.headers);
    expect(headers.get(IDX_SERVICE_AUTH_HEADER)).toBe("service-secret");
    expect(headers.get("X-API-Key")).toBeNull();
    expect(headers.get("X-Tenant-ID")).toBe("huit_admission_chatbot");
    expect(headers.get("X-Corpus-ID")).toBe("admission-chatbot-corpus");
    expect(headers.get("X-Chat-Pipeline")).toBe("huit_chat_multi_query_prod");
  });
});