import { Hono } from "hono";
import { getBrandingSettings } from "../services/branding-config";
import {
  getResolvedLegalDocument,
  getResolvedLegalHome,
  getResolvedPublicLegal,
} from "../services/public-legal";
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

  publicRoutes.get("/legal", async (c) => {
    const locale = c.req.query("locale");
    const legal = await getResolvedPublicLegal(locale);
    return ok(c, { legal });
  });

  publicRoutes.get("/legal/privacy", async (c) => {
    const locale = c.req.query("locale");
    const privacy = await getResolvedLegalDocument("privacy", locale);
    return ok(c, { privacy });
  });

  publicRoutes.get("/legal/terms", async (c) => {
    const locale = c.req.query("locale");
    const terms = await getResolvedLegalDocument("terms", locale);
    return ok(c, { terms });
  });

  publicRoutes.get("/legal/home", async (c) => {
    const locale = c.req.query("locale");
    const home = await getResolvedLegalHome(locale);
    return ok(c, { home });
  });

  return publicRoutes;
}