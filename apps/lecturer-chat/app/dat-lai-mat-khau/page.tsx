import { PasswordResetDisabled } from "@/components/password-reset-disabled";
import { isSelfServicePasswordResetEnabled } from "@/lib/server/password-reset-policy";
import { ResetPasswordView } from "./reset-password-view";

export default function ResetPasswordPage() {
  if (!isSelfServicePasswordResetEnabled()) {
    return <PasswordResetDisabled title="Đặt lại mật khẩu" />;
  }

  return <ResetPasswordView />;
}