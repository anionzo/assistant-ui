import { describe, expect, it } from "vitest";
import { getServerConfig, publicConfig } from "../lib/server/config";

describe("server config", () => {
  it("does not expose service secrets in public config", () => {
    const config = getServerConfig({
      IDX_API_URL: "http://localhost:4000/",
      IDX_SERVICE_SECRET: "secret",
    });

    expect(config.idxApiUrl).toBe("http://localhost:4000");
    expect(publicConfig(config)).not.toHaveProperty("idxServiceSecret");
    expect(publicConfig(config, {})).toMatchObject({ showRuntimeToolbar: false });
    expect(
      publicConfig(config, { SHOW_RUNTIME_TOOLBAR: "true" }),
    ).toMatchObject({ showRuntimeToolbar: true });
  });

  it("falls back to AUTH_API_URL when IDX_API_URL is absent", () => {
    const config = getServerConfig({
      AUTH_API_URL: "http://auth-api:4000",
      IDX_SERVICE_SECRET: "secret",
    });
    expect(config.idxApiUrl).toBe("http://auth-api:4000");
    expect(config.authApiUrl).toBe("http://auth-api:4000");
  });

  it("fails closed when the service secret is missing", () => {
    expect(() =>
      getServerConfig({ IDX_API_URL: "http://localhost:4000" }),
    ).toThrow("IDX_SERVICE_SECRET is required");
  });

  it("requires JWT_SECRET when auth is enabled", () => {
    expect(() =>
      getServerConfig({
        IDX_API_URL: "http://localhost:4000",
        IDX_SERVICE_SECRET: "secret",
        AUTH_REQUIRED: "true",
      }),
    ).toThrow("JWT_SECRET is required when AUTH_REQUIRED=true");
  });

  it("derives allowGuestChat from AUTH_REQUIRED by default, and supports explicit override", () => {
    const guestDefault = getServerConfig({
      IDX_API_URL: "http://localhost:4000",
      IDX_SERVICE_SECRET: "secret",
    });
    expect(guestDefault.allowGuestChat).toBe(true);
    expect(guestDefault.authRequired).toBe(false);

    const authOn = getServerConfig({
      IDX_API_URL: "http://localhost:4000",
      IDX_SERVICE_SECRET: "secret",
      AUTH_REQUIRED: "true",
      JWT_SECRET: "s",
    });
    expect(authOn.allowGuestChat).toBe(false);
    expect(authOn.authRequired).toBe(true);

    const guestOverride = getServerConfig({
      IDX_API_URL: "http://localhost:4000",
      IDX_SERVICE_SECRET: "secret",
      AUTH_REQUIRED: "true",
      JWT_SECRET: "s",
      ALLOW_GUEST_CHAT: "true",
    });
    expect(guestOverride.allowGuestChat).toBe(true);

    const guestDisabled = getServerConfig({
      IDX_API_URL: "http://localhost:4000",
      IDX_SERVICE_SECRET: "secret",
      ALLOW_GUEST_CHAT: "false",
    });
    expect(guestDisabled.allowGuestChat).toBe(false);

    expect(publicConfig(guestOverride)).toMatchObject({ allowGuestChat: true });
  });
});