import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/chat/stream/route";

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
    vi.stubEnv("MODULAR_RAG_GATEWAY_URL", "http://localhost:8030");
    vi.stubEnv("USER_API_KEY", "server-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns 502 when the gateway is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    const response = await POST(request());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ code: "gateway_error" });
  });

  it("forwards SSE without buffering and keeps the API key server-side", async () => {
    const encoder = new TextEncoder();
    const upstreamBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("event: token\ndata: Xin\n\n"));
        controller.close();
      },
    });
    const gatewayFetch = vi.fn().mockResolvedValue(
      new Response(upstreamBody, {
        headers: { "Content-Type": "text/event-stream" },
      }),
    );
    vi.stubGlobal("fetch", gatewayFetch);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    await expect(response.text()).resolves.toBe("event: token\ndata: Xin\n\n");

    const [, init] = gatewayFetch.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("X-API-Key")).toBe("server-secret");
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
