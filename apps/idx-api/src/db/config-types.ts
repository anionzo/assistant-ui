import { buildDefaultLegalConfig } from "../services/legal-defaults";

export const DEFAULT_LOGO_URL = "https://idx.huit.edu.vn/images/logo/logo.svg";

export const CONFIG_KEYS = {
  adminIpAllowlist: "admin.ip_allowlist",
  systemBranding: "system.branding",
  systemChatRuntime: "system.chat_runtime",
  systemLegal: "system.legal",
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

export type ChatRuntimeConfigValue = {
  tenantId: string;
  tenantDisplayName: string;
  defaultCorpusId: string;
  defaultChatPipeline: string;
  defaultVoicePipeline: string;
  defaultTopK: number;
};

export type LegalSectionValue = {
  id: string;
  title: string;
  body: string;
};

export type LegalDocumentValue = {
  useCustom: boolean;
  title: string;
  updatedLabel: string;
  intro: string;
  sections: LegalSectionValue[];
};

export type LegalHomeFeatureValue = {
  title: string;
  body: string;
};

export type LegalHomeValue = {
  useCustom: boolean;
  eyebrow: string;
  description: string;
  features: LegalHomeFeatureValue[];
};

export type LegalLocaleBundle = {
  privacy: LegalDocumentValue;
  terms: LegalDocumentValue;
  home: LegalHomeValue;
};

export type LegalDisplayConfig = {
  footerOnPublicPages: boolean;
  footerOnAuthPages: boolean;
  showHomeFeatures: boolean;
  showHomeCtaRegister: boolean;
};

export type LegalConfigValue = {
  locales: {
    vi: LegalLocaleBundle;
    en: LegalLocaleBundle;
  };
  display: LegalDisplayConfig;
};

export type ConfigValueMap = {
  [CONFIG_KEYS.adminIpAllowlist]: IpAllowlistConfigValue;
  [CONFIG_KEYS.systemBranding]: BrandingConfigValue;
  [CONFIG_KEYS.systemChatRuntime]: ChatRuntimeConfigValue;
  [CONFIG_KEYS.systemLegal]: LegalConfigValue;
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
  [CONFIG_KEYS.systemChatRuntime]: {
    scope: "system",
    schemaVersion: 1,
    value: {
      tenantId: "huit_admission_chatbot",
      tenantDisplayName: "HUIT Admission Chatbot",
      defaultCorpusId: "admission-chatbot-corpus",
      defaultChatPipeline: "huit_chat_multi_query_prod",
      defaultVoicePipeline: "huit_voice_multi_query_prod",
      defaultTopK: 5,
    },
  },
  [CONFIG_KEYS.systemLegal]: {
    scope: "system",
    schemaVersion: 1,
    value: buildDefaultLegalConfig(),
  },
};