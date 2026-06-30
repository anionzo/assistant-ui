import { describe, expect, it } from "vitest";
import { getServerConfig, publicConfig } from "../lib/server/config";

describe("server config", () => {
  it("keeps USER_API_KEY out of public config", () => {
    const config = getServerConfig({
      MODULAR_RAG_GATEWAY_URL: "http://localhost:8030/",
      USER_API_KEY: "secret",
    });

    expect(config.gatewayUrl).toBe("http://localhost:8030");
    expect(publicConfig(config)).not.toHaveProperty("userApiKey");
    expect(publicConfig(config, {})).toMatchObject({ showRuntimeToolbar: false });
    expect(
      publicConfig(config, { SHOW_RUNTIME_TOOLBAR: "true" }),
    ).toMatchObject({ showRuntimeToolbar: true });
  });

  it("fails closed when the API key is missing", () => {
    expect(() =>
      getServerConfig({ MODULAR_RAG_GATEWAY_URL: "http://localhost:8030" }),
    ).toThrow("USER_API_KEY is required");
  });

  it("requires JWT_SECRET when auth is enabled", () => {
    expect(() =>
      getServerConfig({
        MODULAR_RAG_GATEWAY_URL: "http://localhost:8030",
        USER_API_KEY: "secret",
        AUTH_REQUIRED: "true",
      }),
    ).toThrow("JWT_SECRET is required when AUTH_REQUIRED=true");
  });
});
