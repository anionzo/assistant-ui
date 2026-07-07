#!/usr/bin/env node
/**
 * Bootstrap index + RBAC seed — chạy riêng, không gắn vào container start.
 *   pnpm ops:mongo:bootstrap
 */
import { spawnSync } from "node:child_process";
import { loadRootEnv, requireMongoUri, redactUri } from "./_env.mjs";

const { root, env } = loadRootEnv();
const uri = requireMongoUri(env);

console.log(`Mongo bootstrap → ${redactUri(uri)}`);

const result = spawnSync("pnpm", ["--filter", "@idx/idx-api", "db:bootstrap"], {
  cwd: root,
  env: { ...process.env, ...env, MONGODB_URI: uri },
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);