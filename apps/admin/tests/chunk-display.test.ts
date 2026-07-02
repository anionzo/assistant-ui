import { describe, expect, it } from "vitest";
import { extractDisplayFields, isEmbeddingKey, stripEmbeddings } from "../lib/chunk-display";

describe("chunk-display", () => {
  it("strips embedding keys and numeric vector arrays", () => {
    const input = {
      id: "c1",
      content: "hello",
      embedding: [0.1, 0.2, 0.3],
      metadata: { page: 1, dense_vector: Array.from({ length: 64 }, () => 0.5) },
    };
    expect(stripEmbeddings(input)).toEqual({
      id: "c1",
      content: "hello",
      metadata: { page: 1 },
    });
  });

  it("extracts primary text and remaining fields", () => {
    const { primaryText, fields } = extractDisplayFields({
      id: "c1",
      text: "chunk body",
      document_id: "d1",
      content_type: "text",
      embedding: [1, 2, 3],
    });
    expect(primaryText).toBe("chunk body");
    expect(fields.map((f) => f.key)).toEqual(["content_type", "document_id", "id"]);
  });

  it("detects embedding key names", () => {
    expect(isEmbeddingKey("embedding")).toBe(true);
    expect(isEmbeddingKey("chunk_vector")).toBe(true);
    expect(isEmbeddingKey("document_id")).toBe(false);
  });
});