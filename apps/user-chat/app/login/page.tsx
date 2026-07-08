import { isSelfServicePasswordResetEnabled } from "@/lib/server/password-reset-policy";
import { fetchPublicAppConfig } from "@/lib/server/public-app-config";
import { LoginPageClient } from "./login-page-client";

export default async function LoginPage() {
  const config = await fetchPublicAppConfig();

  return (
    <LoginPageClient
      initialBranding={{
        logoUrl: config.branding.logoUrl,
        appName: config.branding.user.appName,
        tagline: config.branding.user.tagline,
      }}
      showForgotPassword={isSelfServicePasswordResetEnabled()}
    />
  );
}
