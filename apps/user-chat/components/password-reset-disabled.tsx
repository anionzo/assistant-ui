"use client";

import Link from "next/link";
import { useT } from "@idx/i18n";

export function PasswordResetDisabled({ title }: { title: string }) {
  const t = useT();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {t("auth.passwordResetDisabled")}
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm text-primary hover:underline">
          {t("auth.backToLogin")}
        </Link>
      </div>
    </main>
  );
}