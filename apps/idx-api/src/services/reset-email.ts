type ResetEmailResult = {
  sent: boolean;
  resetUrl: string;
  devToken?: string;
};

function resetUrlFor(token: string): string {
  const base = (process.env.FRONTEND_URL ?? "http://localhost:3001").replace(/\/$/, "");
  return `${base}/dat-lai-mat-khau?token=${encodeURIComponent(token)}`;
}

export async function sendPasswordResetEmail(
  email: string,
  rawToken: string,
): Promise<ResetEmailResult> {
  const resetUrl = resetUrlFor(rawToken);
  const webhook = process.env.RESET_PASSWORD_WEBHOOK_URL?.trim();

  if (webhook) {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "password_reset",
        email,
        resetUrl,
        token: rawToken,
      }),
    }).catch(() => null);

    if (response?.ok) {
      return { sent: true, resetUrl };
    }
    console.error("[reset-email] webhook failed", response?.status ?? "network");
  }

  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    console.info(`[reset-password] dev reset link for ${email}: ${resetUrl}`);
    return { sent: false, resetUrl, devToken: rawToken };
  }

  console.warn("[reset-email] no RESET_PASSWORD_WEBHOOK_URL configured; email not sent");
  return { sent: false, resetUrl };
}