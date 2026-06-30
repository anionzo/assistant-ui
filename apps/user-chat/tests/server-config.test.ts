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

  it("derives allowGuestChat from AUTH_REQUIRED by default, and supports explicit override", () => {
    // Default when no AUTH_REQUIRED → allow guest
    const guestDefault = getServerConfig({
      MODULAR_RAG_GATEWAY_URL: "http://localhost:8030",
      USER_API_KEY: "secret",
    });
    expect(guestDefault.allowGuestChat).toBe(true);
    expect(guestDefault.authRequired).toBe(false);

    // AUTH_REQUIRED=true → guest disabled by default
    const authOn = getServerConfig({
      MODULAR_RAG_GATEWAY_URL: "http://localhost:8030",
      USER_API_KEY: "secret",
      AUTH_REQUIRED: "true",
      JWT_SECRET: "s",
    });
    expect(authOn.allowGuestChat).toBe(false);
    expect(authOn.authRequired).toBe(true);

    // Explicit ALLOW_GUEST_CHAT=true even with AUTH_REQUIRED
    const guestOverride = getServerConfig({
      MODULAR_RAG_GATEWAY_URL: "http://localhost:8030",
      USER_API_KEY: "secret",
      AUTH_REQUIRED: "true",
      JWT_SECRET: "s",
      ALLOW_GUEST_CHAT: "true",
    });
    expect(guestOverride.allowGuestChat).toBe(true);

    // Explicit false disables guest even if AUTH_REQUIRED=false
    const guestDisabled = getServerConfig({
      MODULAR_RAG_GATEWAY_URL: "http://localhost:8030",
      USER_API_KEY: "secret",
      ALLOW_GUEST_CHAT: "false",
    });
    expect(guestDisabled.allowGuestChat).toBe(false);

    // publicConfig exposes it
    expect(publicConfig(guestOverride)).toMatchObject({ allowGuestChat: true });
  });
});
