import { isLoopbackIp, normalizeClientIp } from "@/lib/ip-allowlist";
import { getAdminConfig } from "@/lib/server/config";

const SERVICE_AUTH_HEADER = "x-idx-service-token";

export type IpAllowlistSettings = {
  enabled: boolean;
  ips: string[];
  updatedAt: string | null;
  updatedBy: string | null;
};

type CacheEntry = {
  settings: IpAllowlistSettings;
  expiresAt: number;
};

let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 10_000;

export function resolveClientIp(headers: Headers): string {
  const candidates: string[] = [];
  const push = (value: string | null | undefined) => {
    if (value?.trim()) candidates.push(value.trim());
  };

  push(headers.get("cf-connecting-ip"));
  push(headers.get("x-real-ip"));

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    for (const part of forwarded.split(",")) push(part);
  }

  push(headers.get("x-client-ip"));

  for (const candidate of candidates) {
    const normalized = normalizeClientIp(candidate);
    if (!isLoopbackIp(normalized)) return normalized;
  }

  if (candidates[0]) return normalizeClientIp(candidates[0]);

  return "127.0.0.1";
}

export async function fetchPublicIp(): Promise<string | null> {
  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { ip?: string };
    const ip = payload.ip?.trim();
    return ip && !isLoopbackIp(ip) ? normalizeClientIp(ip) : null;
  } catch {
    return null;
  }
}

export async function fetchIpAllowlistSettings(): Promise<IpAllowlistSettings> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.settings;
  }

  const { idxApiUrl, idxServiceSecret } = getAdminConfig();
  const response = await fetch(`${idxApiUrl}/internal/ip-allowlist`, {
    headers: {
      [SERVICE_AUTH_HEADER]: idxServiceSecret,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return { enabled: false, ips: [], updatedAt: null, updatedBy: null };
  }

  const payload = await response.json().catch(() => ({})) as {
    data?: IpAllowlistSettings;
  };

  const settings = payload.data?.enabled !== undefined
    ? payload.data
    : { enabled: false, ips: [], updatedAt: null, updatedBy: null };

  cache = { settings, expiresAt: Date.now() + CACHE_TTL_MS };
  return settings;
}

export function invalidateIpAllowlistCache() {
  cache = null;
}