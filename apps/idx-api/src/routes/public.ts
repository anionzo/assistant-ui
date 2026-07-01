import { Hono } from "hono";
import { getBrandingSettings } from "../services/branding-config";
import { getPublicAppConfig } from "../services/public-app-config";
import { ok } from "../utils/response";

export function createPublicRoutes() {
  const publicRoutes = new Hono();

  publicRoutes.get("/branding", async (c) => {
    const branding = await getBrandingSettings();
    return ok(c, { branding });
  });

  publicRoutes.get("/app-config", async (c) => {
    const config = await getPublicAppConfig();
    return ok(c, config);
  });

  return publicRoutes;
}