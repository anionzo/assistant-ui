import { describe, expect, it, vi } from "vitest";
import { CONFIG_DEFAULTS, CONFIG_KEYS } from "../src/db/config-types";

const getAppConfig = vi.fn();
const setAppConfig = vi.fn();

vi.mock("../src/db/mongo/config-store", () => ({
  getAppConfig,
  setAppConfig,
}));

const { getChatRuntimeSettings, updateChatRuntimeSettings } = await import(
  "../src/services/chat-runtime-config"
);

describe("chat runtime config service", () => {
  it("returns stored runtime settings", async () => {
    const defaults = CONFIG_DEFAULTS[CONFIG_KEYS.systemChatRuntime].value;
    getAppConfig.mockResolvedValue({
      key: CONFIG_KEYS.systemChatRuntime,
      scope: "system",
      schemaVersion: 1,
      value: defaults,
      createdAt: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
      updatedBy: "admin-1",
    });

    const runtime = await getChatRuntimeSettings();
    expect(runtime.tenantId).toBe(defaults.tenantId);
    expect(runtime.defaultTopK).toBe(defaults.defaultTopK);
    expect(runtime.updatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("updates pipeline and topK independently", async () => {
    const defaults = CONFIG_DEFAULTS[CONFIG_KEYS.systemChatRuntime].value;
    getAppConfig.mockResolvedValue({
      key: CONFIG_KEYS.systemChatRuntime,
      scope: "system",
      schemaVersion: 1,
      value: defaults,
      createdAt: null,
      updatedAt: null,
      updatedBy: null,
    });
    setAppConfig.mockImplementation(async (_key, value, input) => ({
      key: CONFIG_KEYS.systemChatRuntime,
      scope: "system",
      schemaVersion: 1,
      value,
      createdAt: null,
      updatedAt: "2026-01-02T00:00:00.000Z",
      updatedBy: input.updatedBy,
    }));

    const runtime = await updateChatRuntimeSettings({
      defaultChatPipeline: "huit_chat_v2",
      defaultTopK: 8,
      updatedBy: "admin-2",
    });

    expect(runtime.defaultChatPipeline).toBe("huit_chat_v2");
    expect(runtime.defaultTopK).toBe(8);
    expect(runtime.defaultVoicePipeline).toBe(defaults.defaultVoicePipeline);
  });

  it("rejects invalid tenant id", async () => {
    getAppConfig.mockResolvedValue({
      key: CONFIG_KEYS.systemChatRuntime,
      scope: "system",
      schemaVersion: 1,
      value: CONFIG_DEFAULTS[CONFIG_KEYS.systemChatRuntime].value,
      createdAt: null,
      updatedAt: null,
      updatedBy: null,
    });

    await expect(
      updateChatRuntimeSettings({ tenantId: "INVALID TENANT", updatedBy: "admin-1" }),
    ).rejects.toThrow("invalid_tenant_id");
  });
});