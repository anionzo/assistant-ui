import { isSelfServicePasswordResetEnabled } from "@/lib/server/password-reset-policy";
import { LoginPageClient } from "./login-page-client";

export default function LoginPage() {
  return <LoginPageClient showForgotPassword={isSelfServicePasswordResetEnabled()} />;
}