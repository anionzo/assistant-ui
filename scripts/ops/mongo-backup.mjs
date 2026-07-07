#!/usr/bin/env node
/**
 * Backup DB idx_api qua mongodump (dùng image mongo:7 nếu host không có mongodump).
 *   pnpm ops:mongo:backup
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadRootEnv, requireMongoUri, redactUri, MONGODB_DB_NAME } from "./_env.mjs";

const { root, env } = loadRootEnv();
const uri = requireMongoUri(env);
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const outDir = join(root, "backups", `idx_api-${stamp}`);

mkdirSync(outDir, { recursive: true });
console.log(`Mongo backup → ${outDir}`);
console.log(`  URI: ${redactUri(uri)}`);
console.log(`  DB:  ${MONGODB_DB_NAME}`);

const args = [
  "run",
  "--rm",
  "-v",
  `${outDir}:/backup`,
  "mongo:7",
  "mongodump",
  `--uri=${uri}`,
  `--db=${MONGODB_DB_NAME}`,
  "--out=/backup",
];

const result = spawnSync("docker", args, { stdio: "inherit", shell: false });
if (result.status !== 0) {
  console.error("Backup failed. Cần Docker để chạy mongodump qua image mongo:7.");
  process.exit(result.status ?? 1);
}

console.log(`✅ Backup saved: ${outDir}`);