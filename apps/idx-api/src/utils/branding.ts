export type BrandingSurfaceValue = {
  appName: string;
  tagline: string;
};

export type PublicBranding = {
  logoUrl: string;
  admin: BrandingSurfaceValue;
  user: BrandingSurfaceValue;
  updatedAt: string | null;
};

export function sanitizeLogoUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function sanitizeBrandingText(value: string, maxLength: number): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

