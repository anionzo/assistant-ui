"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { useBranding } from "@/hooks/use-branding";
import { LoginForm } from "./login-form";

export function LoginPageClient({ showForgotPassword }: { showForgotPassword: boolean }) {
  const { branding } = useBranding();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <BrandLogo src={branding.logoUrl} alt={branding.appName} size={44} />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold">{branding.appName}</h1>
            <p className="truncate text-sm text-muted-foreground">{branding.tagline}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Đăng nhập để đồng bộ lịch sử trên mọi thiết bị.
        </p>
        <div className="mt-6">
          <LoginForm showForgotPassword={showForgotPassword} />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Chưa có tài khoản? <Link href="/register" className="text-primary underline">Đăng ký</Link>
        </p>
      </div>
    </main>
  );
}