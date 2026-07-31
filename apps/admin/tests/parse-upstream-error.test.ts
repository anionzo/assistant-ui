import { describe, expect, it } from "vitest";
import {
  errorMessageFromPayload,
  formatBffError,
  BffRequestError,
} from "../lib/api/bff";
import { parseUpstreamErrorMessage } from "../lib/server/parse-upstream-error";

describe("parseUpstreamErrorMessage", () => {
  it("reads idx-api nested error.message", () => {
    expect(
      parseUpstreamErrorMessage(
        JSON.stringify({
          success: false,
          error: { code: "GATEWAY_ERROR", message: "orchestrator form ingest failed" },
        }),
        502,
      ),
    ).toBe("orchestrator form ingest failed");
  });

  it("reads FastAPI ErrorResponse-shaped detail object", () => {
    expect(
      parseUpstreamErrorMessage(
        JSON.stringify({
          detail: {
            code: "http_error",
            service: "orchestrator",
            detail: "orchestrator form ingest failed",
            retryable: false,
          },
        }),
        500,
      ),
    ).toBe("http_error: orchestrator form ingest failed");
  });

  it("reads FastAPI validation error list", () => {
    expect(
      parseUpstreamErrorMessage(
        JSON.stringify({
          detail: [{ loc: ["body", "file"], msg: "field required", type: "value_error" }],
        }),
        422,
      ),
    ).toBe("body.file: field required");
  });

  it("falls back for empty body", () => {
    expect(parseUpstreamErrorMessage("", 503)).toBe("Gateway error (503)");
  });
});

describe("bff error helpers", () => {
  it("extracts message from nested payloads on the client", () => {
    expect(
      errorMessageFromPayload(
        { success: false, error: { message: "missing api key" }, requestId: "r1" },
        401,
      ),
    ).toBe("missing api key");
  });

  it("formats BffRequestError for UI", () => {
    const err = new BffRequestError("boom", 502, {
      code: "gateway_error",
      requestId: "abc",
    });
    expect(formatBffError(err)).toEqual({
      message: "boom",
      status: 502,
      code: "gateway_error",
      requestId: "abc",
    });
  });
});
