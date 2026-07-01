import "dotenv/config";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = postgres(connectionString, { prepare: false });
  try {
    const drizzleDir = join(import.meta.dirname, "../../drizzle");
    const entries = await readdir(drizzleDir);
    const migrations = entries
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of migrations) {
      const content = await readFile(join(drizzleDir, file), "utf8");
      await sql.unsafe(content);
      console.info(`[migrate] ${file} applied`);
    }

    console.info("idx-api migrations complete");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
