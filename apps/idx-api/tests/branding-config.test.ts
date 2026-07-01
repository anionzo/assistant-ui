import { describe, expect, it, vi } from "vitest";
import { CONFIG_DEFAULTS, CONFIG_KEYS } from "../src/db/config-types";

const getAppConfig = vi.fn();
const setAppConfig = vi.fn();

vi.mock("../src/db/mongo/config-store", () => ({
  getAppConfig,
  setAppConfig,
}));

const { getBrandingSettings, updateBrandingSettings } = await import("../src/services/branding-config");

const DEFAULT_LOGO_URL = CONFIG_DEFAULTS[CONFIG_KEYS.systemBranding].value.logoUrl;

describe("branding config service", () => {
  it("normalizes legacy flat branding docs", async () => {
    getAppConfig.mockResolvedValue({
      key: CONFIG_KEYS.systemBranding,
      scope: "system",
      schemaVersion: 1,
      value: {
        logoUrl: DEFAULT_LOGO_URL,
        appName: "Legacy Admin",
        tagline: "Legacy tagline",
      },
      createdAt: null,
      updatedAt: null,
      updatedBy: null,
    });

    const branding = await getBrandingSettings();
    expect(branding.admin.appName).toBe("Legacy Admin");
    expect(branding.user.appName).toBe(CONFIG_DEFAULTS[CONFIG_KEYS.systemBranding].value.user.appName);
  });

  it("updates user surface independently", async () => {
    const defaults = CONFIG_DEFAULTS[CONFIG_KEYS.systemBranding].value;
    getAppConfig.mockResolvedValue({
      key: CONFIG_KEYS.systemBranding,
      scope: "system",
      schemaVersion: 2,
      value: defaults,
      createdAt: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
      updatedBy: "admin-1",
    });
    setAppConfig.mockImplementation(async (_key, value, input) => ({
      key: CONFIG_KEYS.systemBranding,
      scope: "system",
      schemaVersion: 2,
      value,
      createdAt: null,
      updatedAt: "2026-01-02T00:00:00.000Z",
      updatedBy: input.updatedBy,
    }));

    const branding = await updateBrandingSettings({
      user: { appName: "HUIT Chat", tagline: "Tuyển sinh" },
      updatedBy: "admin-2",
    });

    expect(branding.user.appName).toBe("HUIT Chat");
    expect(branding.admin.appName).toBe(defaults.admin.appName);
  });
});