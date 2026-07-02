#!/usr/bin/env node
/**
 * Single source: root `.env` → apps/idx-api/.env, apps/user-chat/.env.local, apps/admin/.env.local
 *
 * Usage:
 *   pnpm setup:env          # create root .env from .env.example if missing, then distribute
 *   pnpm setup:env --check  # verify shared secrets match across app files
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const rootEnv = join(root, ".env");
const rootExample = join(root, ".env.example");

const targets = {
  idxApi: join(root, "apps/idx-api/.env"),
  userChat: join(root, "apps/user-chat/.env.local"),
  admin: join(root, "apps/admin/.env.local"),
};

function parseEnv(content) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    out[key] = value;
  }
  return out;
}

function serializeEnv(sections) {
  return `${sections.map((s) => s.lines.join("\n")).join("\n\n")}\n`;
}

function section(title, entries) {
  return {
    lines: [
      `# ${title}`,
      ...entries.map(([k, v]) => `${k}=${v}`),
    ],
  };
}

function val(env, key, fallback = "") {
  return env[key] ?? fallback;
}

function required(env, key) {
  const value = env[key]?.trim();
  if (!value) throw new Error(`${key} is required in root .env`);
  return value;
}

function buildAppFiles(env) {
  const sharedSecret = val(env, "IDX_SERVICE_SECRET", "dev-service-secret");
  const jwtSecret = val(env, "JWT_SECRET", "dev-jwt-secret-min-32-bytes-long");
  const idxApiUrl = required(env, "IDX_API_URL");
  const userFrontend = required(env, "FRONTEND_URL");
  const adminFrontend = required(env, "ADMIN_FRONTEND_URL");

  const idxApi = serializeEnv([
    section("Generated from root .env — edit root .env then run: pnpm setup:env", []),
    section("idx-api", [
      ["PORT", val(env, "PORT", "4000")],
      ["MONGODB_URI", required(env, "MONGODB_URI")],
      ["JWT_SECRET", jwtSecret],
      ["JWT_ACCESS_TTL", val(env, "JWT_ACCESS_TTL", "3600")],
      ["JWT_REFRESH_TTL", val(env, "JWT_REFRESH_TTL", "604800")],
      ["GOOGLE_CLIENT_ID", val(env, "GOOGLE_CLIENT_ID")],
      ["GOOGLE_CLIENT_SECRET", val(env, "GOOGLE_CLIENT_SECRET")],
      ["GOOGLE_CALLBACK_URL", required(env, "GOOGLE_CALLBACK_URL")],
      ["FRONTEND_URL", userFrontend],
      ["ADMIN_SEED_EMAIL", val(env, "ADMIN_SEED_EMAIL")],
      ["MODULAR_RAG_GATEWAY_URL", required(env, "MODULAR_RAG_GATEWAY_URL")],
      ["USER_API_KEY", val(env, "USER_API_KEY")],
      ["ADMIN_API_KEY", val(env, "ADMIN_API_KEY")],
      ["IDX_SERVICE_SECRET", sharedSecret],
      ["RESET_PASSWORD_WEBHOOK_URL", val(env, "RESET_PASSWORD_WEBHOOK_URL")],
      ["SELF_SERVICE_PASSWORD_RESET_ENABLED", val(env, "SELF_SERVICE_PASSWORD_RESET_ENABLED")],
    ]),
  ]);

  const userChat = serializeEnv([
    section("Generated from root .env — edit root .env then run: pnpm setup:env", []),
    section("user-chat BFF", [
      ["IDX_API_URL", idxApiUrl],
      ["IDX_SERVICE_SECRET", sharedSecret],
      ["AUTH_REQUIRED", val(env, "AUTH_REQUIRED", "false")],
      ["ALLOW_GUEST_CHAT", val(env, "ALLOW_GUEST_CHAT", "true")],
      ["JWT_SECRET", jwtSecret],
      ["FRONTEND_URL", userFrontend],
      ["SELF_SERVICE_PASSWORD_RESET_ENABLED", val(env, "SELF_SERVICE_PASSWORD_RESET_ENABLED")],
    ]),
  ]);

  const admin = serializeEnv([
    section("Generated from root .env — edit root .env then run: pnpm setup:env", []),
    section("admin BFF", [
      ["IDX_API_URL", idxApiUrl],
      ["IDX_SERVICE_SECRET", sharedSecret],
      ["FRONTEND_URL", adminFrontend],
    ]),
  ]);

  return { idxApi, userChat, admin };
}

function readKeys(path) {
  if (!existsSync(path)) return null;
  return parseEnv(readFileSync(path, "utf8"));
}

function checkSync() {
  const files = Object.values(targets);
  const parsed = files.map(readKeys);
  if (parsed.some((p) => !p)) {
    console.error("❌ Thiếu file env app. Chạy: pnpm setup:env");
    process.exit(1);
  }

  const secrets = parsed.map((p) => p.IDX_SERVICE_SECRET).filter(Boolean);
  const jwts = [parsed[0]?.JWT_SECRET, parsed[1]?.JWT_SECRET].filter(Boolean);

  let ok = true;
  if (new Set(secrets).size > 1) {
    console.error("❌ IDX_SERVICE_SECRET không khớp giữa các app");
    ok = false;
  }
  if (jwts.length >= 2 && new Set(jwts).size > 1) {
    console.error("❌ JWT_SECRET không khớp giữa idx-api và user-chat");
    ok = false;
  }
  if (!ok) process.exit(1);
  console.log("✅ Env đồng bộ: IDX_SERVICE_SECRET + JWT_SECRET khớp");
}

function bootstrapRootEnv() {
  const example = existsSync(rootExample)
    ? parseEnv(readFileSync(rootExample, "utf8"))
    : {};
  const idx = readKeys(targets.idxApi) ?? {};
  const user = readKeys(targets.userChat) ?? {};
  const admin = readKeys(targets.admin) ?? {};

  const merged = {
    ...example,
    ...idx,
    ...user,
    FRONTEND_URL: user.FRONTEND_URL ?? idx.FRONTEND_URL ?? example.FRONTEND_URL ?? "http://localhost:3001",
    ADMIN_FRONTEND_URL: admin.FRONTEND_URL ?? example.ADMIN_FRONTEND_URL ?? "http://localhost:3002",
  };

  writeFileSync(rootEnv, serializeEnv([
    section("Idx Chat — single source (pnpm setup:env)", []),
    section("Shared", [
      ["IDX_SERVICE_SECRET", val(merged, "IDX_SERVICE_SECRET", "dev-service-secret")],
      ["JWT_SECRET", val(merged, "JWT_SECRET", "dev-jwt-secret-min-32-bytes-long")],
      ["JWT_ACCESS_TTL", val(merged, "JWT_ACCESS_TTL", "3600")],
      ["JWT_REFRESH_TTL", val(merged, "JWT_REFRESH_TTL", "604800")],
    ]),
    section("idx-api", [
      ["PORT", val(merged, "PORT", "4000")],
      ["MONGODB_URI", val(merged, "MONGODB_URI", "mongodb://localhost:27017/idx_api")],
      ["GOOGLE_CLIENT_ID", val(merged, "GOOGLE_CLIENT_ID")],
      ["GOOGLE_CLIENT_SECRET", val(merged, "GOOGLE_CLIENT_SECRET")],
      ["GOOGLE_CALLBACK_URL", val(merged, "GOOGLE_CALLBACK_URL", "http://localhost:4000/auth/google/callback")],
      ["ADMIN_SEED_EMAIL", val(merged, "ADMIN_SEED_EMAIL")],
      ["MODULAR_RAG_GATEWAY_URL", val(merged, "MODULAR_RAG_GATEWAY_URL", "http://localhost:8030")],
      ["USER_API_KEY", val(merged, "USER_API_KEY")],
      ["ADMIN_API_KEY", val(merged, "ADMIN_API_KEY")],
      ["RESET_PASSWORD_WEBHOOK_URL", val(merged, "RESET_PASSWORD_WEBHOOK_URL")],
      ["SELF_SERVICE_PASSWORD_RESET_ENABLED", val(merged, "SELF_SERVICE_PASSWORD_RESET_ENABLED")],
    ]),
    section("user-chat", [
      ["IDX_API_URL", val(merged, "IDX_API_URL", "http://localhost:4000")],
      ["AUTH_REQUIRED", val(merged, "AUTH_REQUIRED", "false")],
      ["ALLOW_GUEST_CHAT", val(merged, "ALLOW_GUEST_CHAT", "true")],
      ["FRONTEND_URL", val(merged, "FRONTEND_URL", "http://localhost:3001")],
    ]),
    section("admin", [
      ["ADMIN_FRONTEND_URL", val(merged, "ADMIN_FRONTEND_URL", "http://localhost:3002")],
    ]),
  ]), "utf8");

  console.log("📄 Đã gom env app hiện có → root .env");
}

function distribute() {
  if (!existsSync(rootEnv)) {
    if (existsSync(targets.idxApi) || existsSync(targets.userChat) || existsSync(targets.admin)) {
      bootstrapRootEnv();
    } else if (existsSync(rootExample)) {
      copyFileSync(rootExample, rootEnv);
      console.log("📄 Đã tạo .env từ .env.example — chỉnh sửa .env rồi chạy lại pnpm setup:env");
    } else {
      console.error("❌ Không tìm thấy .env.example");
      process.exit(1);
    }
  }

  const env = parseEnv(readFileSync(rootEnv, "utf8"));
  const built = buildAppFiles(env);

  writeFileSync(targets.idxApi, built.idxApi, "utf8");
  writeFileSync(targets.userChat, built.userChat, "utf8");
  writeFileSync(targets.admin, built.admin, "utf8");

  console.log("✅ Đã sinh env từ root .env:");
  console.log(`   ${targets.idxApi}`);
  console.log(`   ${targets.userChat}`);
  console.log(`   ${targets.admin}`);
  console.log("");
  console.log("💡 Chỉ sửa file .env ở root repo, sau đó chạy lại: pnpm setup:env");
}

const mode = process.argv.includes("--check")
  ? "check"
  : "distribute";

if (mode === "check") checkSync();
else distribute();
