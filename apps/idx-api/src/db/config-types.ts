export const DEFAULT_LOGO_URL = "https://idx.huit.edu.vn/images/logo/logo.svg";

export const CONFIG_KEYS = {
  adminIpAllowlist: "admin.ip_allowlist",
  systemBranding: "system.branding",
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

export type BrandingSurfaceValue = {
  appName: string;
  tagline: string;
};

export type BrandingConfigValue = {
  logoUrl: string;
  admin: BrandingSurfaceValue;
  user: BrandingSurfaceValue;
};

export type ConfigValueMap = {
  [CONFIG_KEYS.adminIpAllowlist]: IpAllowlistConfigValue;
  [CONFIG_KEYS.systemBranding]: BrandingConfigValue;
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
  [CONFIG_KEYS.systemBranding]: {
    scope: "system",
    schemaVersion: 2,
    value: {
      logoUrl: DEFAULT_LOGO_URL,
      admin: {
        appName: "Idx Admin",
        tagline: "Operator console",
      },
      user: {
        appName: "Idx Chat",
        tagline: "Trợ lý tuyển sinh HUIT",
      },
    },
  },
};