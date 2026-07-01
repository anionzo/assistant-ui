import "dotenv/config";
import { closeMongo } from "./mongo/client";
import { ensureMongoBootstrap } from "./mongo/bootstrap";

async function main() {
  try {
    await ensureMongoBootstrap();
  } finally {
    await closeMongo();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});