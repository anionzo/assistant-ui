import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as chatStream } from "../app/api/chat/stream/route";
import { POST as voiceStream } from "../app/api/voice/stream/route";
import { GET as listThreads } from "../app/api/threads/route";
import * as sessionResolve from "../lib/auth/session-resolve";

const sessionUser = {
  id: "user-abc",
  email: "user@example.com",
  displayName: "User",
  avatarUrl: null,
};

describe("AUTH_REQUIRED gateway gate", () => {
  beforeEach(() => {
    vi.stubEnv("MODULAR_RAG_GATEWAY_URL", "http://localhost:8030");
    vi.stubEnv("USER_API_KEY", "server-secret");
    vi.stubEnv("AUTH_REQUIRED", "true");
    vi.stubEnv("JWT_SECRET", "test-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("rejects unauthenticated chat stream", async () => {
    vi.spyOn(sessionResolve, "resolveSession").mockResolvedValue(null);

    const response = await chatStream(
      new Request("http://localhost:3001/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Xin chào", conversationId: "thread-1" }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "missing_session" });
  });

  it("prefixes conversation_id for authenticated chat stream", async () => {
    vi.spyOn(sessionResolve, "resolveSession").mockResolvedValue({
      user: sessionUser,
      accessToken: "token",
      refreshed: false,
    });

    const encoder = new TextEncoder();
    const upstreamBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("event: token\ndata: ok\n\n"));
        controller.close();
      },
    });
    const gatewayFetch = vi.fn().mockResolvedValue(
      new Response(upstreamBody, {
        headers: { "Content-Type": "text/event-stream" },
      }),
    );
    vi.stubGlobal("fetch", gatewayFetch);

    const response = await chatStream(
      new Request("http://localhost:3001/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Xin chào", conversationId: "thread-1" }),
      }),
    );

    expect(response.status).toBe(200);
    const [, init] = gatewayFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({
      conversation_id: "user-abc:thread-1",
    });
    expect(new Headers(init.headers).get("X-Conversation-ID")).toBe("user-abc:thread-1");
  });

  it("rejects unauthenticated voice stream", async () => {
    vi.spyOn(sessionResolve, "resolveSession").mockResolvedValue(null);

    const form = new FormData();
    form.append("audio", new Blob(["fake"], { type: "audio/webm" }), "recording.webm");
    form.append("conversation_id", "thread-1");

    const response = await voiceStream(
      new Request("http://localhost:3001/api/voice/stream", {
        method: "POST",
        body: form,
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "missing_session" });
  });

  it("returns 401 for thread list without session when auth is required", async () => {
    vi.spyOn(sessionResolve, "resolveSession").mockResolvedValue(null);

    const response = await listThreads(new Request("http://localhost:3001/api/threads"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "Missing session cookie" });
  });

  it("allows chat stream as guest when ALLOW_GUEST_CHAT=true even if AUTH_REQUIRED=true", async () => {
    vi.stubEnv("ALLOW_GUEST_CHAT", "true");
    vi.spyOn(sessionResolve, "resolveSession").mockResolvedValue(null);

    const encoder = new TextEncoder();
    const upstreamBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("event: token\ndata: guest-ok\n\n"));
        controller.close();
      },
    });
    const gatewayFetch = vi.fn().mockResolvedValue(
      new Response(upstreamBody, {
        headers: { "Content-Type": "text/event-stream" },
      }),
    );
    vi.stubGlobal("fetch", gatewayFetch);

    const response = await chatStream(
      new Request("http://localhost:3001/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Xin chào guest", conversationId: "thread-guest" }),
      }),
    );

    expect(response.status).toBe(200);
    const [, init] = gatewayFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({
      conversation_id: "thread-guest",
    });
  });
});