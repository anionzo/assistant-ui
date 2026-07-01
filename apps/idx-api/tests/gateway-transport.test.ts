import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { SERVICE_AUTH_HEADER } from "../src/middleware/service-auth";
import { signSessionToken } from "../src/services/jwt";
import { createGatewayFixture } from "./fixtures/gateway-fixture";
import { RbacTestStore } from "./helpers/rbac-store";

const USER_KEY = "fixture-user-key";
const ADMIN_KEY = "fixture-admin-key";
const SERVICE_SECRET = "fixture-service-secret";

function serviceHeaders(extra: Record<string, string> = {}) {
  return {
    [SERVICE_AUTH_HEADER]: SERVICE_SECRET,
    ...extra,
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildMultipartBody(
  boundary: string,
  fieldName: string,
  payload: Uint8Array,
  chunkDelayMs: number,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const preamble = encoder.encode(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${fieldName}"; filename="upload.bin"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`,
  );
  const closing = encoder.encode(`\r\n--${boundary}--\r\n`);
  const chunks = [preamble, payload, closing];
  let index = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      if (index > 0) await delay(chunkDelayMs);
      controller.enqueue(chunks[index]!);
      index += 1;
    },
  });
}

describe("E09-S1 gateway transport", () => {
  let fixture = createGatewayFixture();
  let gatewayUrl = "";

  beforeEach(async () => {
    fixture = createGatewayFixture();
    gatewayUrl = await fixture.listen();
    vi.stubEnv("MODULAR_RAG_GATEWAY_URL", gatewayUrl);
    vi.stubEnv("USER_API_KEY", USER_KEY);
    vi.stubEnv("ADMIN_API_KEY", ADMIN_KEY);
    vi.stubEnv("IDX_SERVICE_SECRET", SERVICE_SECRET);
    vi.stubEnv("JWT_SECRET", "test-secret");
    vi.stubEnv("JWT_ACCESS_TTL", "3600");
    fixture.state.sseChunkTimestamps = [];
    fixture.state.upstreamAborted = false;
    fixture.state.multipartChunkTimestamps = [];
    fixture.state.multipartTotalBytes = 0;
    fixture.state.requestIds = [];
    fixture.state.apiKeysUsed = [];
  });

  afterEach(async () => {
    await fixture.close();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("delivers SSE chunks before upstream completion and propagates request ID", async () => {
    const app = createApp(new RbacTestStore());
    const requestId = "req-sse-early-chunk";
    const response = await app.request("/rag/chat/stream", {
      method: "POST",
      headers: serviceHeaders({
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "X-Request-ID": requestId,
      }),
      body: JSON.stringify({
        message: "hello",
        conversation_id: "user:thread-1",
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("x-request-id")).toBe(requestId);
    expect(fixture.state.requestIds).toContain(requestId);
    expect(fixture.state.apiKeysUsed).toEqual([USER_KEY]);

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let received = "";
    let reads = 0;

    while (reads < 2) {
      const chunk = await reader.read();
      expect(chunk.done).toBe(false);
      received += decoder.decode(chunk.value);
      reads += 1;
    }

    expect(received).toContain("event: token");
    expect(fixture.state.sseChunkTimestamps.length).toBeGreaterThanOrEqual(1);

    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      received += decoder.decode(chunk.value);
    }

    expect(received).toContain("event: done");
    expect(fixture.state.sseChunkTimestamps.length).toBeGreaterThanOrEqual(2);
  });

  it("propagates client abort to the upstream SSE request", async () => {
    const app = createApp(new RbacTestStore());
    const controller = new AbortController();

    const response = await app.request("/rag/chat/stream", {
      method: "POST",
      headers: serviceHeaders({
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      }),
      body: JSON.stringify({
        message: "hello",
        conversation_id: "user:thread-1",
      }),
      signal: controller.signal,
    });

    expect(response.status).toBe(200);
    const reader = response.body!.getReader();
    await reader.read();
    controller.abort();
    await reader.cancel().catch(() => undefined);
    await delay(200);

    expect(fixture.state.upstreamAborted).toBe(true);
  });

  it("forwards multipart uploads as a stream without waiting for full body", async () => {
    const store = new RbacTestStore();
    const operator = await store.createUser({ email: "operator@example.com" });
    await store.assignRole(operator.id, 3);
    const token = await signSessionToken({
      id: operator.id,
      email: operator.email,
      displayName: operator.email,
      avatarUrl: null,
      roleIds: [3],
    });

    const app = createApp(store);
    const boundary = "fixture-boundary";
    const payload = new Uint8Array(256 * 1024);
    payload.fill(0x41);
    const body = buildMultipartBody(boundary, "file", payload, 40);

    const uploadStartedAt = Date.now();
    const responsePromise = app.fetch(
      new Request("http://localhost/rag/admin/documents/collections/col-1/files", {
        method: "POST",
        headers: serviceHeaders({
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        }),
        body,
        duplex: "half",
      } as RequestInit),
    );

    await delay(60);
    expect(fixture.state.multipartChunkTimestamps.length).toBeGreaterThan(0);
    expect(fixture.state.multipartTotalBytes).toBe(0);

    const response = await responsePromise;
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
    expect(fixture.state.multipartTotalBytes).toBeGreaterThan(payload.length);
    expect(fixture.state.apiKeysUsed).toEqual([ADMIN_KEY]);
    expect(Date.now() - uploadStartedAt).toBeGreaterThan(40);
    expect(fixture.state.multipartChunkTimestamps.length).toBeGreaterThan(1);
  });
});