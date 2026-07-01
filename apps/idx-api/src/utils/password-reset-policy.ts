export function isSelfServicePasswordResetEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const flag = env.SELF_SERVICE_PASSWORD_RESET_ENABLED?.trim().toLowerCase();
  if (flag === "true" || flag === "1" || flag === "yes") return true;
  if (flag === "false" || flag === "0" || flag === "no") return false;
  return env.NODE_ENV !== "production";
}