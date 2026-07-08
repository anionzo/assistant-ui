"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import { AuthTextField } from "@/components/auth/auth-text-field";
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
      <AuthTextField
        icon={<UserRound className="size-4" />}
        label={
          <>
            {t("auth.displayName")} <span className="font-normal text-slate-400">{t("common.optional")}</span>
          </>
        }
        type="text"
        name="displayName"
        autoComplete="name"
      />
      <AuthTextField
        icon={<Mail className="size-4" />}
        label={t("common.email")}
        type="email"
        name="email"
        autoComplete="email"
        required
      />
      <AuthTextField
        icon={<LockKeyhole className="size-4" />}
        label={t("common.password")}
        type="password"
        name="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <AuthTextField
        icon={<LockKeyhole className="size-4" />}
        label={t("auth.confirmPassword")}
        type="password"
        name="confirmPassword"
        autoComplete="new-password"
        required
      />
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-11 bg-slate-950 text-white shadow-sm shadow-slate-900/10 hover:bg-slate-800"
      >
        {pending ? t("auth.creatingAccount") : t("auth.createAccount")}
      </Button>
    </form>
  );
}
