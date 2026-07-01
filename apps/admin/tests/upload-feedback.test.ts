import { describe, expect, it } from "vitest";
import {
  FORM_UPLOADED_FILE_QUERY,
  FORM_UPLOADED_QUERY,
  formDetailHref,
  formsListHref,
  readUploadFeedback,
} from "../lib/forms/upload-feedback";

describe("upload-feedback", () => {
  it("builds detail href with upload query", () => {
    expect(formDetailHref("FORM_A", { uploaded: true, fileName: "mau.docx" })).toBe(
      `/forms/FORM_A?${FORM_UPLOADED_QUERY}=1&${FORM_UPLOADED_FILE_QUERY}=mau.docx`,
    );
  });

  it("builds forms list href when uploaded", () => {
    expect(formsListHref(true)).toBe(`/forms?${FORM_UPLOADED_QUERY}=1`);
  });

  it("reads upload feedback from search params", () => {
    const params = new URLSearchParams({ [FORM_UPLOADED_QUERY]: "1", [FORM_UPLOADED_FILE_QUERY]: "a.docx" });
    expect(readUploadFeedback(params)).toEqual({ uploaded: true, fileName: "a.docx" });
  });
});