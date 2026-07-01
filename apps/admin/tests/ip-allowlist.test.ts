import { describe, expect, it } from "vitest";
import { isLoopbackIp, normalizeClientIp } from "@/lib/ip-allowlist";
import { resolveClientIp } from "@/lib/server/ip-allowlist";

describe("client ip resolution", () => {
  it("normalizes IPv6 loopback to IPv4 localhost", () => {
    expect(normalizeClientIp("::1")).toBe("127.0.0.1");
    expect(normalizeClientIp("::ffff:192.168.1.5")).toBe("192.168.1.5");
  });

  it("prefers public IP from proxy headers", () => {
    const headers = new Headers({
      "x-forwarded-for": "::1, 203.0.113.10",
      "x-real-ip": "::1",
    });
    expect(resolveClientIp(headers)).toBe("203.0.113.10");
  });

  it("falls back to normalized loopback when only localhost is present", () => {
    const headers = new Headers({ "x-real-ip": "::1" });
    expect(resolveClientIp(headers)).toBe("127.0.0.1");
    expect(isLoopbackIp(resolveClientIp(headers))).toBe(true);
  });
});