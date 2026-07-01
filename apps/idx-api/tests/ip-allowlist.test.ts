import { describe, expect, it } from "vitest";
import { ipMatchesAllowlist, sanitizeIpEntry } from "../src/utils/ip-allowlist";

describe("ip allowlist", () => {
  it("matches exact IPv4 and CIDR", () => {
    expect(ipMatchesAllowlist("10.1.2.3", ["10.0.0.0/8"])).toBe(true);
    expect(ipMatchesAllowlist("192.168.1.5", ["10.0.0.0/8"])).toBe(false);
    expect(ipMatchesAllowlist("203.0.113.4", ["203.0.113.4"])).toBe(true);
  });

  it("always allows localhost", () => {
    expect(ipMatchesAllowlist("127.0.0.1", [])).toBe(true);
    expect(ipMatchesAllowlist("::1", [])).toBe(true);
  });

  it("sanitizes ip entries", () => {
    expect(sanitizeIpEntry(" 10.0.0.0/8 ")).toBe("10.0.0.0/8");
    expect(sanitizeIpEntry("::1")).toBe("127.0.0.1");
    expect(sanitizeIpEntry("bad-ip")).toBeNull();
  });
});