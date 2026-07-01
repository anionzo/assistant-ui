import { getBrandingSettings } from "./branding-config";
import { getChatRuntimeSettings } from "./chat-runtime-config";

export async function getPublicAppConfig() {
  const [branding, chatRuntime] = await Promise.all([
    getBrandingSettings(),
    getChatRuntimeSettings(),
  ]);
  return { branding, chatRuntime };
}