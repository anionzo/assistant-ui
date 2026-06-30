import "dotenv/config";
import { serve } from "@hono/node-server";
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

serve({
  fetch: app.fetch,
  port,
});

console.info(`auth-api listening on :${port}`);
