import { describe, expect, it } from "vitest";
import { BffRequestError } from "../lib/api/bff";
import {
  isAllowedFormFileName,
  isFormStillProcessingError,
  parseFormIngestResponse,
} from "../lib/forms/ingest";
import {
  FORM_PROCESSING_QUERY,
  FORM_UPLOADED_QUERY,
  formDetailHref,
  readUploadFeedback,
} from "../lib/forms/upload-feedback";

describe("parseFormIngestResponse", () => {
  it("parses gateway FormIngestResponse", () => {
    expect(
      parseFormIngestResponse({
        form_code: "DON_TAM_TRU",
        status: "queued",
        job_id: "job-123",
        schema_version: "v1",
      }),
    ).toEqual({
      formCode: "DON_TAM_TRU",
      status: "queued",
      jobId: "job-123",
      schemaVersion: "v1",
      templatePath: undefined,
    });
  });

  it("unwraps success/data envelope", () => {
    expect(
      parseFormIngestResponse({
        success: true,
        data: { form_code: "A", status: "queued" },
      }),
    ).toMatchObject({ formCode: "A", status: "queued" });
  });

  it("returns null without form_code", () => {
    expect(parseFormIngestResponse({ status: "queued" })).toBeNull();
  });
});

describe("isFormStillProcessingError", () => {
  it("treats 404 BffRequestError as processing", () => {
    expect(isFormStillProcessingError(new BffRequestError("form not found", 404))).toBe(true);
  });

  it("treats form-not-found message as processing", () => {
    expect(isFormStillProcessingError(new Error("Form not found"))).toBe(true);
  });

  it("does not treat unrelated errors as processing", () => {
    expect(isFormStillProcessingError(new BffRequestError("forbidden", 403))).toBe(false);
    expect(isFormStillProcessingError(new Error("timeout"))).toBe(false);
  });
});

// Note: BffRequestError(message, status, opts?) — third arg is options object.

describe("form file helpers", () => {
  it("accepts docx only (orchestrator rejects .doc)", () => {
    expect(isAllowedFormFileName("a.docx")).toBe(true);
    expect(isAllowedFormFileName("a.DOCX")).toBe(true);
    expect(isAllowedFormFileName("a.doc")).toBe(false);
    expect(isAllowedFormFileName("a.pdf")).toBe(false);
  });
});

describe("upload-feedback processing", () => {
  it("builds detail href with processing + job", () => {
    expect(
      formDetailHref("FORM_A", {
        processing: true,
        uploaded: true,
        fileName: "mau.docx",
        jobId: "j1",
      }),
    ).toBe(
      `/forms/FORM_A?${FORM_UPLOADED_QUERY}=1&${FORM_PROCESSING_QUERY}=1&file=mau.docx&job=j1`,
    );
  });

  it("reads processing feedback", () => {
    const params = new URLSearchParams({
      [FORM_UPLOADED_QUERY]: "1",
      [FORM_PROCESSING_QUERY]: "1",
      job: "abc",
    });
    expect(readUploadFeedback(params)).toEqual({
      uploaded: true,
      processing: true,
      fileName: undefined,
      jobId: "abc",
    });
  });
});
