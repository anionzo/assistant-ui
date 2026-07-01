export type Locale = "vi" | "en";

export const LOCALES: Locale[] = ["vi", "en"];
export const DEFAULT_LOCALE: Locale = "vi";
export const LOCALE_COOKIE = "idx_locale";

export interface MessageTree {
  [key: string]: string | MessageTree;
}

export function resolveLocale(value?: string | null): Locale {
  return value === "en" ? "en" : "vi";
}

export function translate(
  messages: MessageTree,
  key: string,
  params?: Record<string, string | number>,
): string {
  const parts = key.split(".");
  let node: string | MessageTree | undefined = messages;

  for (const part of parts) {
    if (!node || typeof node !== "object") return key;
    node = node[part];
  }

  if (typeof node !== "string") return key;

  if (!params) return node;

  return node.replace(/\{(\w+)\}/g, (_, token: string) => {
    const value = params[token];
    return value === undefined ? `{${token}}` : String(value);
  });
}