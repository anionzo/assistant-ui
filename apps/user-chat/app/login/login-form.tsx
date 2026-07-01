"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({ showForgotPassword = false }: { showForgotPassword?: boolean }) {
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
      setError("Email không hợp lệ.");
      return;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
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
      setError(typeof payload.error === "string" ? payload.error : "Đăng nhập thất bại");
      return;
    }

    router.push("/chat");
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <label className="flex flex-col gap-2 text-sm">
        <span>Email</span>
        <input className="w-full rounded-md border border-border px-3 py-2" type="email" name="email" required />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span>Mật khẩu</span>
          {showForgotPassword ? (
            <Link href="/quen-mat-khau" className="text-xs text-primary hover:underline">
              Quên mật khẩu?
            </Link>
          ) : null}
        </div>
        <input className="w-full rounded-md border border-border px-3 py-2" type="password" name="password" required />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </Button>
      <Button type="button" variant="outline" size="lg" onClick={() => window.location.assign("/api/auth/google")}>
        Đăng nhập bằng Google
      </Button>
    </form>
  );
}
