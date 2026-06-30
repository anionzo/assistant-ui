import { describe, expect, it } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function listRouteFiles(root: string): string[] {
  const entries = readdirSync(root);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(root, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listRouteFiles(fullPath));
      continue;
    }
    if (entry === "route.ts") files.push(fullPath);
  }
  return files;
}

describe("security boundary", () => {
  it("user-chat has no document or forms write BFF routes", () => {
    const userApiRoot = join(process.cwd(), "..", "user-chat", "app", "api");
    const routes = listRouteFiles(userApiRoot);
    const forbidden = routes.filter(
      (route) => route.includes(`${join("api", "documents")}`) || route.includes(`${join("api", "forms")}`),
    );
    expect(forbidden).toEqual([]);
  });

  it("admin has no chat, voice, or thread routes", () => {
    const adminApiRoot = join(process.cwd(), "app", "api");
    const routes = listRouteFiles(adminApiRoot);
    const forbidden = routes.filter(
      (route) =>
        route.includes(join("api", "chat")) ||
        route.includes(join("api", "voice")) ||
        route.includes(join("api", "threads")),
    );
    expect(forbidden).toEqual([]);
  });
});