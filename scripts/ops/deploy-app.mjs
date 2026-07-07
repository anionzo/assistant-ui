#!/usr/bin/env node
/**
 * Deploy app an toàn: inspect → (optional backup) → build/up app → bootstrap → health.
 *   pnpm ops:deploy
 *   pnpm ops:deploy -- --skip-backup
 */
import { spawnSync } from "node:child_process";
import { loadRootEnv, requireMongoUri, redactUri } from "./_env.mjs";

const { root, env } = loadRootEnv();
const uri = requireMongoUri(env);
const skipBackup = process.argv.includes("--skip-backup");

function run(label, cmd, args, extraEnv = {}) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(cmd, args, {
    cwd: root,
    env: { ...process.env, ...env, ...extraEnv },
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    console.error(`\n❌ ${label} failed (exit ${result.status})`);
    process.exit(result.status ?? 1);
  }
}

console.log("Deploy Idx Chat (app only — Mongo qua MONGODB_URI)");
console.log(`  MONGODB_URI: ${redactUri(uri)}`);

run("mongo inspect (before)", "node", ["scripts/ops/mongo-inspect.mjs"]);

if (!skipBackup) {
  run("mongo backup", "node", ["scripts/ops/mongo-backup.mjs"]);
} else {
  console.log("\n⏭ Skipping backup (--skip-backup)");
}

run("docker compose up app", "docker", ["compose", "up", "-d", "--build"]);
run("mongo bootstrap", "node", ["scripts/ops/mongo-bootstrap.mjs"]);
run("mongo inspect (after)", "node", ["scripts/ops/mongo-inspect.mjs"]);

console.log("\n▶ health checks");
for (const url of ["http://localhost:4000/health", "http://localhost:3003/api/health"]) {
  const r = spawnSync(
    "node",
    ["-e", `fetch("${url}").then(r=>{console.log("${url}",r.status);process.exit(r.ok?0:1)}).catch(e=>{console.error(e);process.exit(1)})`],
    { stdio: "inherit", shell: true },
  );
  if (r.status !== 0) {
    console.warn(`⚠ ${url} not OK (stack may use different ports on server)`);
  }
}

console.log("\n✅ Deploy finished");