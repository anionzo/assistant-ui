import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/voice/stream/route";

function request() {
  const form = new FormData();
  form.append("audio", new Blob(["fake-audio"], { type: "audio/webm" }), "recording.webm");
  form.append("conversation_id", "thread-1");

  return new Request("http://localhost:3001/api/voice/stream", {
    method: "POST",
    body: form,
  });
}

describe("POST /api/voice/stream", () => {
  beforeEach(() => {
    vi.stubEnv("MODULAR_RAG_GATEWAY_URL", "http://localhost:8030");
    vi.stubEnv("USER_API_KEY", "server-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("forwards audio as audio_b64 to the gateway voice stream", async () => {
    const encoder = new TextEncoder();
    const upstreamBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("event: done\ndata: [DONE]\n\n"));
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

    const [url, init] = gatewayFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8030/voice/chat/stream");
    expect(new Headers(init.headers).get("X-API-Key")).toBe("server-secret");
    expect(JSON.parse(String(init.body))).toMatchObject({
      audio_b64: Buffer.from("fake-audio").toString("base64"),
      conversation_id: "thread-1",
    });
  });

  it("returns gateway_error when upstream rejects the payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "invalid audio" }), { status: 422 }),
      ),
    );

    const response = await POST(request());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      code: "gateway_error",
      error: "Voice gateway rejected the request",
    });
  });
});