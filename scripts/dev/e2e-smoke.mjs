#!/usr/bin/env node

const args = new Set(process.argv.slice(2));
const userBase = process.env.SMOKE_USER_URL ?? "http://localhost:3001";
const idxBase = process.env.SMOKE_IDX_URL ?? "http://localhost:4000";
const adminBase = process.env.SMOKE_ADMIN_URL ?? "http://localhost:3002";

async function check(name, url, expectOk = true) {
  const started = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const ok = expectOk ? res.ok : true;
    const status = `${res.status} (${Date.now() - started}ms)`;
    if (!ok) {
      console.error(`FAIL ${name} ${url} -> ${status}`);
      return false;
    }
    console.log(`OK   ${name} ${url} -> ${status}`);
    return true;
  } catch (error) {
    console.error(`FAIL ${name} ${url} -> ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

let passed = 0;
let failed = 0;

async function run(name, fn) {
  const ok = await fn();
  if (ok) passed += 1;
  else failed += 1;
}

await run("idx-api health", () => check("idx-api /health", `${idxBase}/health`));
await run("idx-api rag health", () => check("idx-api /health/rag", `${idxBase}/health/rag`));
await run("user-chat health", () => check("user-chat /api/health", `${userBase}/api/health`));
await run("user-chat config", () => check("user-chat /api/config", `${userBase}/api/config`));

if (args.has("--admin")) {
  await run("admin health", () => check("admin /api/health", `${adminBase}/api/health`));
}

if (args.has("--e03")) {
  const res = await fetch(`${userBase}/api/threads`, {
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  const status = res?.status ?? "network";
  if (status === 401 || status === 200) {
    console.log(`OK   user-chat /api/threads -> ${status} (auth gate)`);
    passed += 1;
  } else {
    console.error(`FAIL user-chat /api/threads -> ${status}`);
    failed += 1;
  }
}

console.log(`\nSmoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);