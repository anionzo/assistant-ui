"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@idx/i18n";

function ResetForm() {
  const t = useT();
  const searchParams = useSearchParams()!;
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError(t("auth.passwordMin8"));
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(typeof data.error === "string" ? data.error : t("auth.resetFailed"));
      }
    } catch {
      setError(t("common.connectionError"));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mt-6 text-sm">
        <p className="text-muted-foreground">{t("auth.resetSuccess")}</p>
        <Link href="/login" className="mt-4 inline-block text-primary hover:underline">
          {t("auth.backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm">
        <span>{t("auth.resetToken")}</span>
        <input
          className="rounded-md border border-border px-3 py-2 font-mono text-xs"
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          placeholder={t("auth.resetTokenPlaceholder")}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span>{t("auth.newPassword")}</span>
        <input
          className="rounded-md border border-border px-3 py-2"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" disabled={loading}>
        {loading ? t("common.processing") : t("auth.resetPassword")}
      </Button>
    </form>
  );
}

export function ResetPasswordView() {
  const t = useT();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">{t("auth.resetTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("auth.resetHint")}</p>
        <Suspense fallback={<div className="mt-6 text-sm text-muted-foreground">{t("common.loading")}</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </main>
  );
}