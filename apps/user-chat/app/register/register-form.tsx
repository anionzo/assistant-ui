"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterForm() {
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

    // Client-side validation
    if (!EMAIL_RE.test(email)) {
      setError("Email không hợp lệ.");
      return;
    }
    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
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
      setError(typeof payload.error === "string" ? payload.error : "Đăng ký thất bại");
      return;
    }

    router.push("/chat");
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <label className="flex flex-col gap-2 text-sm">
        <span>Tên hiển thị <span className="text-muted-foreground">(không bắt buộc)</span></span>
        <input className="rounded-md border border-border px-3 py-2" type="text" name="displayName" />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span>Email</span>
        <input className="rounded-md border border-border px-3 py-2" type="email" name="email" required />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span>Mật khẩu</span>
        <input className="rounded-md border border-border px-3 py-2" type="password" name="password" minLength={8} required />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span>Nhập lại mật khẩu</span>
        <input className="rounded-md border border-border px-3 py-2" type="password" name="confirmPassword" required />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
      </Button>
    </form>
  );
}
