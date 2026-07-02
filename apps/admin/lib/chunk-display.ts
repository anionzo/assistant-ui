const CONTENT_KEYS = new Set(["content", "text"]);
const EMBEDDING_KEY_RE = /embed|vector/i;

export type DisplayField = {
  key: string;
  value: string;
  multiline: boolean;
};

export function isEmbeddingKey(key: string): boolean {
  return EMBEDDING_KEY_RE.test(key);
}

function isNumericEmbeddingArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length > 32 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
}

export function stripEmbeddings(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripEmbeddings);
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (isEmbeddingKey(key) || isNumericEmbeddingArray(child)) continue;
      result[key] = stripEmbeddings(child);
    }
    return result;
  }
  return value;
}

export function formatFieldValue(value: unknown): { value: string; multiline: boolean } {
  if (value === null || value === undefined) {
    return { value: "—", multiline: false };
  }
  if (typeof value === "string") {
    return { value, multiline: value.includes("\n") || value.length > 160 };
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return { value: String(value), multiline: false };
  }
  try {
    const json = JSON.stringify(value, null, 2);
    return { value: json, multiline: true };
  } catch {
    return { value: String(value), multiline: false };
  }
}

export function extractDisplayFields(
  record: Record<string, unknown>,
  options?: { contentKeys?: string[]; skipKeys?: string[] },
): { primaryText: string; fields: DisplayField[] } {
  const contentKeys = new Set(options?.contentKeys ?? [...CONTENT_KEYS]);
  const skipKeys = new Set(options?.skipKeys ?? []);
  const cleaned = stripEmbeddings(record) as Record<string, unknown>;

  const textParts: string[] = [];
  for (const key of contentKeys) {
    const value = cleaned[key];
    if (typeof value === "string" && value.trim()) textParts.push(value);
  }

  const fields: DisplayField[] = [];
  for (const [key, value] of Object.entries(cleaned)) {
    if (contentKeys.has(key) || skipKeys.has(key) || value === undefined) continue;
    const formatted = formatFieldValue(value);
    fields.push({ key, value: formatted.value, multiline: formatted.multiline });
  }

  fields.sort((a, b) => a.key.localeCompare(b.key));
  return { primaryText: textParts.join("\n\n"), fields };
}