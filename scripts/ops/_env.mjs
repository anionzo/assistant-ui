import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

export const MONGODB_DB_NAME = "idx_api";
export const MONGODB_VOLUME_NAME = "idx_chat_mongodata";

export function loadRootEnv() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) {
    throw new Error("Missing root .env — copy .env.example and set MONGODB_URI");
  }
  const env = { ...process.env };
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return { root, envPath, env };
}

export function requireMongoUri(env) {
  const uri = env.MONGODB_URI?.trim();
  if (!uri) throw new Error("MONGODB_URI is required in root .env");
  return uri;
}

export function redactUri(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
}