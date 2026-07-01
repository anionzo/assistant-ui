import { describe, expect, it } from "vitest";
import { resolveLocale, translate } from "../src/core";

describe("i18n core", () => {
  it("resolves locale", () => {
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("vi")).toBe("vi");
    expect(resolveLocale(undefined)).toBe("vi");
  });

  it("translates nested keys with params", () => {
    const messages = {
      nav: { login: "Đăng nhập" },
      guest: "Guest mode — {action}",
    };
    expect(translate(messages, "nav.login")).toBe("Đăng nhập");
    expect(translate(messages, "guest", { action: "sign in" })).toBe("Guest mode — sign in");
    expect(translate(messages, "missing.key")).toBe("missing.key");
  });
});