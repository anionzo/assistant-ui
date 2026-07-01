/** Emergency fallbacks when idx-api is unreachable — keep aligned with idx-api CONFIG_DEFAULTS. */
export const APP_CONFIG_FALLBACKS = {
  branding: {
    logoUrl: "https://idx.huit.edu.vn/images/logo/logo.svg",
    admin: { appName: "Idx Admin", tagline: "Operator console" },
    user: { appName: "Idx Chat", tagline: "Trợ lý tuyển sinh HUIT" },
  },
  chatRuntime: {
    tenantId: "huit_admission_chatbot",
    tenantDisplayName: "HUIT Admission Chatbot",
    defaultCorpusId: "admission-chatbot-corpus",
    defaultChatPipeline: "huit_chat_multi_query_prod",
    defaultVoicePipeline: "huit_voice_multi_query_prod",
    defaultTopK: 5,
  },
} as const;