"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LockKeyhole, Mail } from "lucide-react";
import { AuthTextField } from "@/components/auth/auth-text-field";
import { Button } from "@/components/ui/button";
import { useT } from "@idx/i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({ showForgotPassword = false }: { showForgotPassword?: boolean }) {
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

    if (!EMAIL_RE.test(email)) {
      setError(t("auth.invalidEmail"));
      return;
    }
    if (!password) {
      setError(t("auth.enterPassword"));
      return;
    }

    setPending(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setPending(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(typeof payload.error === "string" ? payload.error : t("auth.loginFailed"));
      return;
    }

    router.push("/chat");
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <AuthTextField
        icon={<Mail className="size-4" />}
        label={t("common.email")}
        type="email"
        name="email"
        autoComplete="email"
        required
      />
      <AuthTextField
        action={
          showForgotPassword ? (
            <Link href="/quen-mat-khau" className="text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline">
              {t("auth.forgotPassword")}
            </Link>
          ) : null
        }
        icon={<LockKeyhole className="size-4" />}
        label={t("common.password")}
        type="password"
        name="password"
        autoComplete="current-password"
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
        {pending ? t("auth.loggingIn") : t("auth.login")}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50"
        onClick={() => window.location.assign("/api/auth/google")}
      >
        <span className="flex size-5 items-center justify-center rounded-full bg-white text-sm font-semibold text-blue-600 shadow-sm ring-1 ring-slate-200">
          G
        </span>
        {t("auth.loginWithGoogle")}
      </Button>
    </form>
  );
}
