import { describe, expect, it } from "vitest";
import { CONFIG_DEFAULTS, CONFIG_KEYS } from "../src/db/config-types";
import { normalizeLegacyAppConfigDoc } from "../src/db/mongo/config-store";

describe("app_config", () => {
  it("defines JSON defaults for admin IP allowlist", () => {
    const defaults = CONFIG_DEFAULTS[CONFIG_KEYS.adminIpAllowlist];
    expect(defaults.scope).toBe("admin");
    expect(defaults.schemaVersion).toBe(1);
    expect(defaults.value).toEqual({ enabled: false, ips: [] });
  });

  it("normalizes flat legacy docs into value JSON", () => {
    const now = new Date("2026-01-15T10:00:00.000Z");
    const normalized = normalizeLegacyAppConfigDoc(
      {
        _id: CONFIG_KEYS.adminIpAllowlist,
        enabled: true,
        ips: ["10.0.0.0/8"],
        updatedAt: now,
        updatedBy: "user-1",
      },
      CONFIG_KEYS.adminIpAllowlist,
    );

    expect(normalized).toEqual({
      _id: CONFIG_KEYS.adminIpAllowlist,
      scope: "admin",
      schemaVersion: 1,
      value: { enabled: true, ips: ["10.0.0.0/8"] },
      createdAt: now,
      updatedAt: now,
      updatedBy: "user-1",
    });
  });

  it("passes through docs that already use value JSON", () => {
    const doc = {
      _id: CONFIG_KEYS.adminIpAllowlist,
      scope: "admin" as const,
      schemaVersion: 1,
      value: { enabled: false, ips: ["203.0.113.1"] },
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: null,
    };

    expect(normalizeLegacyAppConfigDoc(doc, CONFIG_KEYS.adminIpAllowlist)).toEqual(doc);
  });
});