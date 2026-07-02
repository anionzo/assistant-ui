#!/usr/bin/env node
/**
 * Pre-commit build gate: typecheck + production build must pass.
 *
 * Usage:
 *   pnpm test:build
 */

import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function runStep(label, script) {
  console.log(`\n▶ ${label}`);
  try {
    execSync(`pnpm ${script}`, { cwd: root, stdio: "inherit", env: process.env });
  } catch (error) {
    const code = error && typeof error === "object" && "status" in error ? error.status : 1;
    console.error(`\n❌ ${label} failed (exit ${code ?? "unknown"})`);
    process.exit(code ?? 1);
  }
  console.log(`✅ ${label}`);
}

console.log("Build check — typecheck + build (no errors before commit)");

runStep("typecheck", "typecheck");
runStep("build", "build");

console.log("\n✅ Build check passed");