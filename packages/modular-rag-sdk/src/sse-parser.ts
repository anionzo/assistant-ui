import type { ParsedStreamEvent, StreamMetadata } from "./types";

type RawSseEvent = { event: string; data: string };

function parseDataLine(line: string) {
  const value = line.slice(5);
  return value.startsWith(" ") ? value.slice(1) : value;
}

function normalizeEvent({ event, data }: RawSseEvent): ParsedStreamEvent | null {
  const type = event || "message";

  if (type === "done" || data === "[DONE]") return { type: "done" };

  if (type === "token" || type === "message") {
    if (!data) return null;
    try {
      const value = JSON.parse(data) as unknown;
      if (typeof value === "string") return { type: "token", token: value };
      if (value && typeof value === "object" && "token" in value) {
        const token = (value as { token?: unknown }).token;
        if (typeof token === "string") return { type: "token", token };
      }
    } catch {
      return { type: "token", token: data };
    }
    return { type: "token", token: data };
  }

  if (type === "metadata") {
    try {
      return { type: "metadata", metadata: JSON.parse(data) as StreamMetadata };
    } catch {
      return { type: "error", message: "Gateway returned invalid metadata", details: data };
    }
  }

  if (type === "error") {
    try {
      const details = JSON.parse(data) as unknown;
      const message =
        details && typeof details === "object" && "message" in details
          ? String((details as { message: unknown }).message)
          : data || "Gateway stream failed";
      return { type: "error", message, details };
    } catch {
      return { type: "error", message: data || "Gateway stream failed" };
    }
  }

  return null;
}

export async function* parseModularRagSse(
  source: ReadableStream<Uint8Array>,
): AsyncGenerator<ParsedStreamEvent> {
  const reader = source.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const drain = function* (final = false): Generator<ParsedStreamEvent> {
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = final ? "" : (blocks.pop() ?? "");

    for (const block of blocks) {
      let event = "message";
      const data: string[] = [];
      for (const line of block.split(/\r?\n/)) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data.push(parseDataLine(line));
      }
      const parsed = normalizeEvent({ event, data: data.join("\n") });
      if (parsed) yield parsed;
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      yield* drain();
    }
    buffer += decoder.decode();
    if (buffer.trim()) buffer += "\n\n";
    yield* drain(true);
  } finally {
    reader.releaseLock();
  }
}
