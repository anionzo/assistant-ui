/**
 * Fallbacks when idx-api is unreachable or before branding loads.
 * Branding stays empty/neutral so the UI does not flash product-specific names/logos.
 * chatRuntime keeps operational defaults so chat can still function offline.
 */
export const APP_CONFIG_FALLBACKS = {
  branding: {
    logoUrl: "",
    admin: { appName: "", tagline: "" },
    user: { appName: "", tagline: "" },
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