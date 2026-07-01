import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxyToGateway } from "../src/gateway/client";

const USER_KEY = "user-secret-key";
const ADMIN_KEY = "admin-secret-key";
const GATEWAY_URL = "http://secret-gateway.internal:8030";

describe("gateway client", () => {
  beforeEach(() => {
    vi.stubEnv("MODULAR_RAG_GATEWAY_URL", GATEWAY_URL);
    vi.stubEnv("USER_API_KEY", USER_KEY);
    vi.stubEnv("ADMIN_API_KEY", ADMIN_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("redacts upstream infrastructure details from non-SSE gateway errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: `failed at ${GATEWAY_URL} with key ${USER_KEY}`,
          }),
          { status: 502, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const response = await proxyToGateway({
      upstreamPath: "/pipelines",
      method: "GET",
      incomingHeaders: new Headers(),
      credential: "user",
      requestId: "req-redact",
    });

    expect(response.status).toBe(502);
    const payload = await response.json();
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain(GATEWAY_URL);
    expect(serialized).not.toContain(USER_KEY);
    expect(payload.error.message).toContain("[gateway]");
  });
});