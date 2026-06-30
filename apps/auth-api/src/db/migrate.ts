import "dotenv/config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = postgres(connectionString, { prepare: false });
  try {
    const migrationPath = join(import.meta.dirname, "../../drizzle/0000_init.sql");
    const statement = await readFile(migrationPath, "utf8");
    await sql.unsafe(statement);
    console.info("auth-api migrations applied");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
