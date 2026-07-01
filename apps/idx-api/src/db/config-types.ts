export const CONFIG_KEYS = {
  adminIpAllowlist: "admin.ip_allowlist",
} as const;

export type ConfigKey = (typeof CONFIG_KEYS)[keyof typeof CONFIG_KEYS];

export type ConfigScope = "admin" | "system";

export type AppConfigRecord<T> = {
  key: ConfigKey;
  scope: ConfigScope;
  schemaVersion: number;
  value: T;
  createdAt: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type IpAllowlistConfigValue = {
  enabled: boolean;
  ips: string[];
};

export type ConfigValueMap = {
  [CONFIG_KEYS.adminIpAllowlist]: IpAllowlistConfigValue;
};

export const CONFIG_DEFAULTS: {
  [K in ConfigKey]: {
    scope: ConfigScope;
    schemaVersion: number;
    value: ConfigValueMap[K];
  };
} = {
  [CONFIG_KEYS.adminIpAllowlist]: {
    scope: "admin",
    schemaVersion: 1,
    value: {
      enabled: false,
      ips: [],
    },
  },
};