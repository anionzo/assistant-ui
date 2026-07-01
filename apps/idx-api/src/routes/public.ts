import { Hono } from "hono";
import { getBrandingSettings } from "../services/branding-config";
import { ok } from "../utils/response";

export function createPublicRoutes() {
  const publicRoutes = new Hono();

  publicRoutes.get("/branding", async (c) => {
    const branding = await getBrandingSettings();
    return ok(c, { branding });
  });

  return publicRoutes;
}