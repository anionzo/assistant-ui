import { fetchPublicAppConfig } from "@/lib/server/public-app-config";
import { RegisterPageClient } from "./register-page-client";

export default async function RegisterPage() {
  const config = await fetchPublicAppConfig();

  return (
    <RegisterPageClient
      initialBranding={{
        logoUrl: config.branding.logoUrl,
        appName: config.branding.user.appName,
        tagline: config.branding.user.tagline,
      }}
    />
  );
}
