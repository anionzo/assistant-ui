import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONFIG_DEFAULTS, CONFIG_KEYS } from "../src/db/config-types";

const getAppConfig = vi.fn();
const setAppConfig = vi.fn();

vi.mock("../src/db/mongo/config-store", () => ({
  getAppConfig,
  setAppConfig,
}));

const { getAdminIpAllowlistSettings, updateAdminIpAllowlistSettings } = await import(
  "../src/services/admin-ip-allowlist-config"
);

function baseRecord(overrides?: Partial<{ enabled: boolean; ips: string[] }>) {
  const defaults = CONFIG_DEFAULTS[CONFIG_KEYS.adminIpAllowlist];
  return {
    key: CONFIG_KEYS.adminIpAllowlist,
    scope: defaults.scope,
    schemaVersion: defaults.schemaVersion,
    value: {
      enabled: overrides?.enabled ?? false,
      ips: overrides?.ips ?? [],
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    updatedBy: "admin-1",
  };
}

describe("admin ip allowlist config service", () => {
  beforeEach(() => {
    getAppConfig.mockReset();
    setAppConfig.mockReset();
  });

  it("returns public settings from app_config JSON value", async () => {
    getAppConfig.mockResolvedValue(baseRecord({ ips: ["10.0.0.0/8"] }));

    const settings = await getAdminIpAllowlistSettings();

    expect(settings).toEqual({
      enabled: false,
      ips: ["10.0.0.0/8"],
      updatedAt: "2026-01-02T00:00:00.000Z",
      updatedBy: "admin-1",
    });
  });

  it("adds sanitized IP before enabling", async () => {
    getAppConfig.mockResolvedValue(baseRecord());
    setAppConfig.mockImplementation(async (_key, value, input) => ({
      ...baseRecord({ enabled: value.enabled, ips: value.ips }),
      updatedBy: input.updatedBy,
      updatedAt: "2026-01-03T00:00:00.000Z",
    }));

    const settings = await updateAdminIpAllowlistSettings({
      addIp: " 203.0.113.4 ",
      enabled: true,
      updatedBy: "admin-2",
      clientIp: "203.0.113.4",
    });

    expect(setAppConfig).toHaveBeenCalledWith(
      CONFIG_KEYS.adminIpAllowlist,
      { enabled: true, ips: ["203.0.113.4"] },
      { updatedBy: "admin-2" },
    );
    expect(settings.enabled).toBe(true);
    expect(settings.ips).toEqual(["203.0.113.4"]);
  });

  it("rejects enabling without IPs", async () => {
    getAppConfig.mockResolvedValue(baseRecord());

    await expect(
      updateAdminIpAllowlistSettings({ enabled: true, updatedBy: "admin-2", clientIp: "127.0.0.1" }),
    ).rejects.toThrow("ips_required");
  });

  it("rejects enabling when client IP is not in list", async () => {
    getAppConfig.mockResolvedValue(baseRecord({ ips: ["10.0.0.0/8"] }));

    await expect(
      updateAdminIpAllowlistSettings({
        enabled: true,
        updatedBy: "admin-2",
        clientIp: "203.0.113.4",
      }),
    ).rejects.toThrow("client_ip_not_allowed");
  });
});