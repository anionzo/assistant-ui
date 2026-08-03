import { describe, expect, it } from "vitest";
import { buildRagMessageCustom } from "../lib/rag-metadata";

describe("buildRagMessageCustom", () => {
  it("returns null when metadata has no contexts", () => {
    expect(buildRagMessageCustom(null)).toBeNull();
    expect(buildRagMessageCustom({ contexts: [] })).toBeNull();
  });

  it("maps contexts and citations into message custom fields", () => {
    expect(
      buildRagMessageCustom({
        contexts: [
          {
            id: "ctx-1",
            text: "Thông tin tuyển sinh",
            score: 0.91,
            metadata: { title: "Quy chế", url: "https://example.com/qc" },
          },
        ],
        citations: [{ id: "c1" }],
      }),
    ).toEqual({
      ragContexts: [
        {
          id: "ctx-1",
          text: "Thông tin tuyển sinh",
          score: 0.91,
          metadata: { title: "Quy chế", url: "https://example.com/qc" },
        },
      ],
      ragCitations: [{ id: "c1" }],
    });
  });
});