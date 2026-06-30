import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { authRoutes } from "./routes/auth";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));
app.route("/auth", authRoutes);

const port = Number(process.env.PORT ?? 4000);

serve({
  fetch: app.fetch,
  port,
});

console.info(`auth-api listening on :${port}`);
