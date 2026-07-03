import { describe, expect, it, vi } from "vitest";
import { CONFIG_DEFAULTS, CONFIG_KEYS } from "../src/db/config-types";

const getAppConfig = vi.fn();
const setAppConfig = vi.fn();

vi.mock("../src/db/mongo/config-store", () => ({
  getAppConfig,
  setAppConfig,
}));

const { getLegalSettings, updateLegalSettings } = await import("../src/services/legal-config");
const { getResolvedPublicLegal } = await import("../src/services/public-legal");

describe("legal config service", () => {
  it("returns normalized defaults", async () => {
    getAppConfig.mockResolvedValue({
      key: CONFIG_KEYS.systemLegal,
      scope: "system",
      schemaVersion: 1,
      value: {},
      createdAt: null,
      updatedAt: null,
      updatedBy: null,
    });

    const legal = await getLegalSettings();
    expect(legal.locales.vi.privacy.title).toBe("Chính sách bảo mật");
    expect(legal.display.footerOnPublicPages).toBe(true);
  });

  it("patches privacy document for a locale", async () => {
    const defaults = CONFIG_DEFAULTS[CONFIG_KEYS.systemLegal].value;
    getAppConfig.mockResolvedValue({
      key: CONFIG_KEYS.systemLegal,
      scope: "system",
      schemaVersion: 1,
      value: defaults,
      createdAt: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
      updatedBy: "admin-1",
    });
    setAppConfig.mockImplementation(async (_key, value, input) => ({
      key: CONFIG_KEYS.systemLegal,
      scope: "system",
      schemaVersion: 1,
      value,
      createdAt: null,
      updatedAt: "2026-01-02T00:00:00.000Z",
      updatedBy: input.updatedBy,
    }));

    const legal = await updateLegalSettings({
      locale: "vi",
      document: "privacy",
      patch: {
        useCustom: true,
        title: "Privacy tùy chỉnh",
        sections: [{ id: "s1", title: "Mục 1", body: "Nội dung mục 1" }],
      },
      updatedBy: "admin-2",
    });

    expect(legal.locales.vi.privacy.useCustom).toBe(true);
    expect(legal.locales.vi.privacy.title).toBe("Privacy tùy chỉnh");
    expect(legal.locales.en.privacy.title).toBe(defaults.locales.en.privacy.title);
  });

  it("resolves public legal with fallback when useCustom is false", async () => {
    const defaults = CONFIG_DEFAULTS[CONFIG_KEYS.systemLegal].value;
    getAppConfig.mockResolvedValue({
      key: CONFIG_KEYS.systemLegal,
      scope: "system",
      schemaVersion: 1,
      value: defaults,
      createdAt: null,
      updatedAt: null,
      updatedBy: null,
    });

    const resolved = await getResolvedPublicLegal("vi");
    expect(resolved.privacy.title).toBe("Chính sách bảo mật");
    expect(resolved.home.eyebrow).toBe("Nền tảng trợ lý AI");
  });
});