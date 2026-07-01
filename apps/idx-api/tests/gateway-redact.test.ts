import { describe, expect, it } from "vitest";
import { redactGatewayMessage } from "../src/gateway/redact";

describe("gateway redact", () => {
  it("removes gateway URLs, API keys, and raw infrastructure hints", () => {
    const config = {
      gatewayUrl: "http://secret-gateway.internal:8030",
      userApiKey: "user-secret-key",
      adminApiKey: "admin-secret-key",
    };

    const message =
      "failed at http://secret-gateway.internal:8030 with USER_API_KEY=user-secret-key and ADMIN_API_KEY=admin-secret-key";

    expect(redactGatewayMessage(message, config)).toBe(
      "failed at [gateway] with [config]=[redacted] and [config]=[redacted]",
    );
    expect(redactGatewayMessage(message, config)).not.toContain("secret-gateway");
    expect(redactGatewayMessage(message, config)).not.toContain("user-secret-key");
  });
});