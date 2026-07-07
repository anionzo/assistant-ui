#!/usr/bin/env node
/**
 * Kiểm tra MongoDB qua MONGODB_URI — đếm collections, không đụng app stack.
 *   pnpm ops:mongo:inspect
 */
import { createRequire } from "node:module";
import { loadRootEnv, requireMongoUri, redactUri, MONGODB_DB_NAME } from "./_env.mjs";

const require = createRequire(import.meta.url);
const { MongoClient } = require("../../apps/idx-api/node_modules/mongodb");

const { env } = loadRootEnv();
const uri = requireMongoUri(env);

console.log("Mongo inspect — Idx Chat");
console.log(`  DB name (code): ${MONGODB_DB_NAME}`);
console.log(`  URI: ${redactUri(uri)}`);

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(MONGODB_DB_NAME);
  const users = await db.collection("users").countDocuments();
  const threads = await db.collection("chat_threads").countDocuments();
  const sessions = await db.collection("voice_form_sessions").countDocuments();
  const roles = await db.collection("roles").countDocuments();

  console.log("\nCounts:");
  console.log(`  users:              ${users}`);
  console.log(`  chat_threads:       ${threads}`);
  console.log(`  voice_form_sessions: ${sessions}`);
  console.log(`  roles:              ${roles}`);

  if (threads > 0) {
    const latest = await db
      .collection("chat_threads")
      .find({}, { projection: { title: 1, userId: 1, updatedAt: 1 } })
      .sort({ updatedAt: -1 })
      .limit(3)
      .toArray();
    console.log("\nLatest chat_threads:");
    for (const t of latest) {
      console.log(`  - ${t._id} | user=${t.userId} | ${t.title ?? "(no title)"}`);
    }
  } else {
    console.log("\n⚠ chat_threads = 0 — DB trống hoặc URI trỏ nhầm instance.");
    console.log("  Gợi ý: docker volume ls | findstr mongodata  (tìm volume cũ trên server)");
  }
} finally {
  await client.close();
}