import { describe, expect, it } from "vitest";
import { parseModularRagSse } from "../src/sse-parser";

function stream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}

async function collect(chunks: string[]) {
  const events = [];
  for await (const event of parseModularRagSse(stream(chunks))) events.push(event);
  return events;
}

describe("parseModularRagSse", () => {
  it("parses text and JSON token payloads across chunk boundaries", async () => {
    await expect(
      collect(["event: token\ndata: Xin", " chào\n\nevent: token\ndata: {\"token\":\"!\"}\n\n"]),
    ).resolves.toEqual([
      { type: "token", token: "Xin chào" },
      { type: "token", token: "!" },
    ]);
  });

  it("extracts metadata contexts and done", async () => {
    await expect(
      collect([
        'event: metadata\ndata: {"contexts":[{"id":"1","text":"Nguồn","score":0.9}]}\n\n',
        "event: done\ndata: [DONE]\n\n",
      ]),
    ).resolves.toEqual([
      {
        type: "metadata",
        metadata: { contexts: [{ id: "1", text: "Nguồn", score: 0.9 }] },
      },
      { type: "done" },
    ]);
  });

  it("normalizes an SSE error", async () => {
    await expect(
      collect(['event: error\ndata: {"message":"Pipeline unavailable"}\n\n']),
    ).resolves.toEqual([
      {
        type: "error",
        message: "Pipeline unavailable",
        details: { message: "Pipeline unavailable" },
      },
    ]);
  });

  it("preserves whitespace-only token payloads", async () => {
    await expect(
      collect(["event: token\ndata:  \n\nevent: token\ndata: B\n\n"]),
    ).resolves.toEqual([
      { type: "token", token: " " },
      { type: "token", token: "B" },
    ]);
  });
});
