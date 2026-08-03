import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/voice/stream/route";
import { IDX_SERVICE_AUTH_HEADER } from "../lib/server/idx-api-rag";
import { mockResolvedServerConfig } from "./helpers/resolved-config";

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
    vi.stubEnv("IDX_API_URL", "http://localhost:4000");
    vi.stubEnv("IDX_SERVICE_SECRET", "service-secret");
    mockResolvedServerConfig();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("forwards audio as audio_b64 through idx-api voice stream", async () => {
    const encoder = new TextEncoder();
    const upstreamBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("event: done\ndata: [DONE]\n\n"));
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

    const [url, init] = idxFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:4000/rag/voice/stream");
    expect(new Headers(init.headers).get(IDX_SERVICE_AUTH_HEADER)).toBe("service-secret");
    expect(JSON.parse(String(init.body))).toMatchObject({
      audio_b64: Buffer.from("fake-audio").toString("base64"),
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

  it("returns gateway_error when idx-api rejects the payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: false, error: { code: "GATEWAY_ERROR", message: "invalid audio" } }),
          { status: 422 },
        ),
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