#!/usr/bin/env node
/**
 * Pre-commit build gate: typecheck + production build must pass.
 *
 * Usage:
 *   pnpm test:build
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function runStep(label, args) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync("pnpm", args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: true,
  });

  if (result.status !== 0) {
    console.error(`\n❌ ${label} failed (exit ${result.status ?? "unknown"})`);
    process.exit(result.status ?? 1);
  }

  console.log(`✅ ${label}`);
}

console.log("Build check — typecheck + build (no errors before commit)");

runStep("typecheck", ["typecheck"]);
runStep("build", ["build"]);

console.log("\n✅ Build check passed");