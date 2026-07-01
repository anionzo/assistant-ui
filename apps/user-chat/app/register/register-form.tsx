"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useT } from "@idx/i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterForm() {
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirmPassword") ?? "");
    const displayName = String(formData.get("displayName") ?? "").trim();

    if (!EMAIL_RE.test(email)) {
      setError(t("auth.invalidEmail"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.passwordMin8"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    setPending(true);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName: displayName || null }),
    });

    setPending(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(typeof payload.error === "string" ? payload.error : t("auth.registerFailed"));
      return;
    }

    router.push("/chat");
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <label className="flex flex-col gap-2 text-sm">
        <span>
          {t("auth.displayName")}{" "}
          <span className="text-muted-foreground">{t("common.optional")}</span>
        </span>
        <input className="rounded-md border border-border px-3 py-2" type="text" name="displayName" />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span>{t("common.email")}</span>
        <input className="rounded-md border border-border px-3 py-2" type="email" name="email" required />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span>{t("common.password")}</span>
        <input className="rounded-md border border-border px-3 py-2" type="password" name="password" minLength={8} required />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span>{t("auth.confirmPassword")}</span>
        <input className="rounded-md border border-border px-3 py-2" type="password" name="confirmPassword" required />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("auth.creatingAccount") : t("auth.createAccount")}
      </Button>
    </form>
  );
}