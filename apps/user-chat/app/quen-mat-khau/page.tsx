import { PasswordResetDisabled } from "@/components/password-reset-disabled";
import { isSelfServicePasswordResetEnabled } from "@/lib/server/password-reset-policy";
import { ForgotPasswordView } from "./forgot-password-view";

export default function ForgotPasswordPage() {
  if (!isSelfServicePasswordResetEnabled()) {
    return <PasswordResetDisabled title="Quên mật khẩu" />;
  }

  return <ForgotPasswordView />;
}