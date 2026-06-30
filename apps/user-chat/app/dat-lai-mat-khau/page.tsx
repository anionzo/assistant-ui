"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams()!;
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
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
        setError(typeof data.error === "string" ? data.error : "Đặt lại mật khẩu thất bại.");
      }
    } catch {
      setError("Lỗi kết nối.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mt-6 text-sm">
        <p className="text-muted-foreground">Mật khẩu đã được đặt lại thành công.</p>
        <Link href="/login" className="mt-4 inline-block text-primary hover:underline">
          ← Quay lại đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm">
        <span>Mã đặt lại mật khẩu</span>
        <input
          className="rounded-md border border-border px-3 py-2 font-mono text-xs"
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          placeholder="Paste token from email / console"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        <span>Mật khẩu mới</span>
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
        {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Đặt lại mật khẩu</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nhập mã xác nhận và mật khẩu mới.
        </p>
        <Suspense fallback={<div className="mt-6 text-sm text-muted-foreground">Đang tải...</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </main>
  );
}
