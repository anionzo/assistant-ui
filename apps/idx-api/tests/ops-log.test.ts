import { afterEach, describe, expect, it } from "vitest";
import {
  _resetOpsLogsForTests,
  listOpsLogs,
  logGatewayEvent,
  logHttpRequest,
  pushOpsLog,
} from "../src/services/ops-log";

describe("ops-log ring buffer", () => {
  afterEach(() => {
    _resetOpsLogsForTests();
  });

  it("stores newest events first and filters by level", () => {
    pushOpsLog({ level: "info", source: "http", message: "ok path" });
    pushOpsLog({ level: "error", source: "gateway", message: "boom" });

    const all = listOpsLogs({ limit: 10 });
    expect(all.entries[0]?.message).toBe("boom");
    expect(all.total).toBe(2);

    const errors = listOpsLogs({ level: "error" });
    expect(errors.entries).toHaveLength(1);
    expect(errors.entries[0]?.level).toBe("error");
  });

  it("skips healthy health probes", () => {
    logHttpRequest({
      method: "GET",
      path: "/health",
      status: 200,
      durationMs: 1,
    });
    expect(listOpsLogs().total).toBe(0);

    logHttpRequest({
      method: "GET",
      path: "/health",
      status: 503,
      durationMs: 2,
    });
    expect(listOpsLogs().total).toBe(1);
  });

  it("records gateway failures", () => {
    logGatewayEvent({
      upstreamPath: "/forms/voice/fill",
      method: "POST",
      status: 502,
      message: "Gateway unreachable: fetch failed",
      requestId: "req-1",
    });
    const { entries } = listOpsLogs();
    expect(entries[0]).toMatchObject({
      source: "gateway",
      path: "/forms/voice/fill",
      status: 502,
      requestId: "req-1",
    });
  });
});
