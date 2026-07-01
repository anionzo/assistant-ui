import {
  CONFIG_DEFAULTS,
  CONFIG_KEYS,
  type BrandingConfigValue,
  type BrandingSurfaceValue,
} from "../db/config-types";
import { getAppConfig, setAppConfig } from "../db/mongo/config-store";
import {
  sanitizeBrandingText,
  sanitizeLogoUrl,
  type PublicBranding,
} from "../utils/branding";

function normalizeBrandingValue(raw: BrandingConfigValue | Record<string, unknown>): BrandingConfigValue {
  const defaults = CONFIG_DEFAULTS[CONFIG_KEYS.systemBranding].value;

  if (
    raw &&
    typeof raw === "object" &&
    "admin" in raw &&
    "user" in raw &&
    typeof (raw as BrandingConfigValue).admin === "object" &&
    typeof (raw as BrandingConfigValue).user === "object"
  ) {
    const value = raw as BrandingConfigValue;
    return {
      logoUrl: typeof value.logoUrl === "string" && value.logoUrl ? value.logoUrl : defaults.logoUrl,
      admin: {
        appName: value.admin.appName?.trim() || defaults.admin.appName,
        tagline: value.admin.tagline?.trim() || defaults.admin.tagline,
      },
      user: {
        appName: value.user.appName?.trim() || defaults.user.appName,
        tagline: value.user.tagline?.trim() || defaults.user.tagline,
      },
    };
  }

  const legacy = raw as { logoUrl?: string; appName?: string; tagline?: string };
  return {
    logoUrl: legacy.logoUrl?.trim() || defaults.logoUrl,
    admin: {
      appName: legacy.appName?.trim() || defaults.admin.appName,
      tagline: legacy.tagline?.trim() || defaults.admin.tagline,
    },
    user: defaults.user,
  };
}

function toPublicBranding(
  record: Awaited<ReturnType<typeof getAppConfig<typeof CONFIG_KEYS.systemBranding>>>,
): PublicBranding {
  const value = normalizeBrandingValue(record.value as BrandingConfigValue);
  return {
    logoUrl: value.logoUrl,
    admin: value.admin,
    user: value.user,
    updatedAt: record.updatedAt,
  };
}

function mergeSurface(
  current: BrandingSurfaceValue,
  patch: Partial<BrandingSurfaceValue> | undefined,
  defaults: BrandingSurfaceValue,
): BrandingSurfaceValue {
  if (!patch) return current;
  return {
    appName: patch.appName !== undefined
      ? (sanitizeBrandingText(patch.appName, 80) ?? current.appName)
      : current.appName,
    tagline: patch.tagline !== undefined
      ? (sanitizeBrandingText(patch.tagline, 120) ?? current.tagline)
      : current.tagline,
  };
}

export async function getBrandingSettings(): Promise<PublicBranding> {
  const record = await getAppConfig(CONFIG_KEYS.systemBranding);
  return toPublicBranding(record);
}

export async function updateBrandingSettings(input: {
  logoUrl?: string;
  admin?: Partial<BrandingSurfaceValue>;
  user?: Partial<BrandingSurfaceValue>;
  updatedBy: string;
}): Promise<PublicBranding> {
  const current = await getAppConfig(CONFIG_KEYS.systemBranding);
  const defaults = CONFIG_DEFAULTS[CONFIG_KEYS.systemBranding].value;
  const normalized = normalizeBrandingValue(current.value as BrandingConfigValue);

  const value: BrandingConfigValue = {
    logoUrl: normalized.logoUrl,
    admin: { ...normalized.admin },
    user: { ...normalized.user },
  };

  if (input.logoUrl !== undefined) {
    const sanitized = sanitizeLogoUrl(input.logoUrl);
    if (!sanitized) throw new Error("invalid_logo_url");
    value.logoUrl = sanitized;
  }

  if (input.admin) {
    if (input.admin.appName !== undefined && !sanitizeBrandingText(input.admin.appName, 80)) {
      throw new Error("invalid_admin_app_name");
    }
    if (input.admin.tagline !== undefined && !sanitizeBrandingText(input.admin.tagline, 120)) {
      throw new Error("invalid_admin_tagline");
    }
    value.admin = mergeSurface(value.admin, input.admin, defaults.admin);
  }

  if (input.user) {
    if (input.user.appName !== undefined && !sanitizeBrandingText(input.user.appName, 80)) {
      throw new Error("invalid_user_app_name");
    }
    if (input.user.tagline !== undefined && !sanitizeBrandingText(input.user.tagline, 120)) {
      throw new Error("invalid_user_tagline");
    }
    value.user = mergeSurface(value.user, input.user, defaults.user);
  }

  const saved = await setAppConfig(CONFIG_KEYS.systemBranding, value, {
    updatedBy: input.updatedBy,
  });
  return toPublicBranding(saved);
}