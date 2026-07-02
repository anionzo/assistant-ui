#!/usr/bin/env node
/**
 * Safe prepare hook: skip in CI/Docker; no-op when install-git-hooks is absent.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.CI === "true" || process.env.SKIP_PREPARE === "1") {
  process.exit(0);
}

const hookScript = join(dirname(fileURLToPath(import.meta.url)), "install-git-hooks.mjs");
if (!existsSync(hookScript)) {
  process.exit(0);
}

const result = spawnSync("node", [hookScript], { stdio: "inherit" });
process.exit(result.status ?? 1);