#!/usr/bin/env node
/**
 * Point git at repo-local hooks in .githooks/ (pre-commit runs pnpm test:build).
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const hooksDir = ".githooks";

if (!existsSync(join(root, ".git"))) {
  process.exit(0);
}

try {
  const current = execSync("git config core.hooksPath", { cwd: root, encoding: "utf8" }).trim();
  if (current === hooksDir) {
    process.exit(0);
  }
  if (current) {
    console.log(`ℹ️  git core.hooksPath already set to "${current}" — skip auto-install`);
    process.exit(0);
  }
} catch {
  // unset
}

execSync(`git config core.hooksPath ${hooksDir}`, { cwd: root });
console.log(`✅ Git hooks → ${hooksDir}/ (pre-commit: pnpm test:build)`);