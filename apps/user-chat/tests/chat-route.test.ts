import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/chat/stream/route";
import { IDX_SERVICE_AUTH_HEADER } from "../lib/server/idx-api-rag";

const requestBody = {
  message: "Xin chào",
  conversationId: "thread-1",
};

function request() {
  return new Request("http://localhost:3001/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
}

describe("POST /api/chat/stream", () => {
  beforeEach(() => {
    vi.stubEnv("IDX_API_URL", "http://localhost:4000");
    vi.stubEnv("IDX_SERVICE_SECRET", "service-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns 502 when idx-api is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    const response = await POST(request());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ code: "gateway_error" });
  });

  it("forwards SSE through idx-api without exposing gateway credentials", async () => {
    const encoder = new TextEncoder();
    const upstreamBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("event: token\ndata: Xin\n\n"));
        controller.close();
      },
    });
    const idxFetch = vi.fn().mockResolvedValue(
      new Response(upstreamBody, {
        headers: { "Content-Type": "text/event-stream" },
      }),
    );
    vi.stubGlobal("fetch", idxFetch);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    await expect(response.text()).resolves.toBe("event: token\ndata: Xin\n\n");

    const [url, init] = idxFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/rag/chat/stream");
    expect(new Headers(init.headers).get(IDX_SERVICE_AUTH_HEADER)).toBe("service-secret");
    expect(new Headers(init.headers).get("X-API-Key")).toBeNull();
    expect(JSON.parse(String(init.body))).toMatchObject({
      message: "Xin chào",
      conversation_id: "thread-1",
    });
  });

  it("rejects requests without a session when AUTH_REQUIRED=true", async () => {
    vi.stubEnv("AUTH_REQUIRED", "true");
    vi.stubEnv("JWT_SECRET", "test-secret");
    vi.stubGlobal("fetch", vi.fn());

    const response = await POST(request());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "missing_session" });
  });
});