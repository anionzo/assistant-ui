import { CONFIG_KEYS, type IpAllowlistConfigValue } from "../db/config-types";
import { getAppConfig, setAppConfig } from "../db/mongo/config-store";
import { ipMatchesAllowlist, sanitizeIpEntry, type IpAllowlistSettings } from "../utils/ip-allowlist";

function toPublicSettings(
  record: Awaited<ReturnType<typeof getAppConfig<typeof CONFIG_KEYS.adminIpAllowlist>>>,
): IpAllowlistSettings {
  return {
    enabled: record.value.enabled,
    ips: record.value.ips,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy,
  };
}

export async function getAdminIpAllowlistSettings(): Promise<IpAllowlistSettings> {
  const record = await getAppConfig(CONFIG_KEYS.adminIpAllowlist);
  return toPublicSettings(record);
}

export async function updateAdminIpAllowlistSettings(input: {
  enabled?: boolean;
  ips?: string[];
  addIp?: string;
  removeIp?: string;
  updatedBy: string;
  clientIp?: string;
}): Promise<IpAllowlistSettings> {
  const current = await getAppConfig(CONFIG_KEYS.adminIpAllowlist);
  const value: IpAllowlistConfigValue = {
    enabled: current.value.enabled,
    ips: [...current.value.ips],
  };

  if (input.addIp) {
    const sanitized = sanitizeIpEntry(input.addIp);
    if (!sanitized) throw new Error("invalid_ip");
    if (!value.ips.includes(sanitized)) value.ips.push(sanitized);
  }

  if (input.removeIp) {
    const sanitized = sanitizeIpEntry(input.removeIp);
    if (sanitized) value.ips = value.ips.filter((ip) => ip !== sanitized);
  }

  if (input.ips) {
    value.ips = input.ips
      .map((ip) => sanitizeIpEntry(ip))
      .filter((ip): ip is string => !!ip);
  }

  if (input.enabled !== undefined) {
    value.enabled = input.enabled;
  }

  if (value.enabled && value.ips.length === 0) {
    throw new Error("ips_required");
  }
  if (value.enabled && input.clientIp && !ipMatchesAllowlist(input.clientIp, value.ips)) {
    throw new Error("client_ip_not_allowed");
  }

  const saved = await setAppConfig(CONFIG_KEYS.adminIpAllowlist, value, {
    updatedBy: input.updatedBy,
  });
  return toPublicSettings(saved);
}