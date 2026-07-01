import { Hono } from "hono";
import { getAdminIpAllowlistSettings } from "../services/admin-ip-allowlist-config";
import { requireServiceAuth } from "../middleware/service-auth";
import { ok } from "../utils/response";

export function createInternalRoutes() {
  const internal = new Hono();

  internal.use("*", requireServiceAuth);

  internal.get("/ip-allowlist", async (c) => {
    const settings = await getAdminIpAllowlistSettings();
    return ok(c, settings);
  });

  return internal;
}