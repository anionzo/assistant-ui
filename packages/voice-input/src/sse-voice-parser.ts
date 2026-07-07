import type { AudioChunk, VoiceMetadata, VoiceStreamEvent } from "./types";

type RawSseEvent = { event: string; data: string };

function parseDataLine(line: string) {
  const value = line.slice(5);
  return value.startsWith(" ") ? value.slice(1) : value;
}

function normalizeVoiceEvent({ event, data }: RawSseEvent): VoiceStreamEvent | null {
  const type = event || "message";

  if (type === "done" || data === "[DONE]") return { type: "done" };

  if (type === "transcript") {
    if (!data) return null;
    try {
      const parsed = JSON.parse(data) as Record<string, unknown>;
      if (typeof parsed.transcript === "string") return { type: "transcript", text: parsed.transcript };
      if (typeof parsed.text === "string") return { type: "transcript", text: parsed.text };
    } catch {
      return { type: "transcript", text: data };
    }
    return { type: "transcript", text: data };
  }

  if (type === "audio_chunk") {
    if (!data) return null;
    try {
      const parsed = JSON.parse(data) as Record<string, unknown>;
      const format = typeof parsed.format === "string" ? parsed.format : undefined;
      if (typeof parsed.data === "string") {
        return { type: "audio_chunk", chunk: { data: parsed.data, format } };
      }
      const ref =
        typeof parsed.ref === "string"
          ? parsed.ref
          : typeof parsed.audio_ref === "string"
            ? parsed.audio_ref
            : undefined;
      if (ref) return { type: "audio_chunk", chunk: { ref, format } };
    } catch {
      return null;
    }
    return null;
  }

  if (type === "metadata") {
    try {
      return { type: "metadata", metadata: JSON.parse(data) as VoiceMetadata };
    } catch {
      return { type: "error", message: "Invalid voice metadata", details: data };
    }
  }

  if (type === "error") {
    try {
      const details = JSON.parse(data) as unknown;
      const message =
        details && typeof details === "object" && "message" in details
          ? String((details as { message: unknown }).message)
          : data || "Voice stream failed";
      return { type: "error", message, details };
    } catch {
      return { type: "error", message: data || "Voice stream failed" };
    }
  }

  return null;
}

export async function* parseVoiceSse(
  source: ReadableStream<Uint8Array>,
): AsyncGenerator<VoiceStreamEvent> {
  const reader = source.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const drain = function* (final = false): Generator<VoiceStreamEvent> {
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = final ? "" : (blocks.pop() ?? "");

    for (const block of blocks) {
      let event = "message";
      const data: string[] = [];
      for (const line of block.split(/\r?\n/)) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data.push(parseDataLine(line));
      }
      const parsed = normalizeVoiceEvent({ event, data: data.join("\n") });
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
