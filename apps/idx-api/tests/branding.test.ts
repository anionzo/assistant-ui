import { describe, expect, it } from "vitest";
import { CONFIG_DEFAULTS, CONFIG_KEYS, DEFAULT_LOGO_URL } from "../src/db/config-types";

describe("branding config", () => {
  it("seeds HUIT logo and separate admin/user surfaces", () => {
    const defaults = CONFIG_DEFAULTS[CONFIG_KEYS.systemBranding];
    expect(defaults.scope).toBe("system");
    expect(defaults.schemaVersion).toBe(2);
    expect(defaults.value.logoUrl).toBe(DEFAULT_LOGO_URL);
    expect(defaults.value.admin.appName).toBe("Idx Admin");
    expect(defaults.value.user.appName).toBe("Idx Chat");
  });
});