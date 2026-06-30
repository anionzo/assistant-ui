"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "done">("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStep("done");
      } else {
        setError(typeof data.error === "string" ? data.error : "Có lỗi xảy ra.");
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Quên mật khẩu</h1>

        {step === "email" ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Nhập email đã đăng ký. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
            </p>
            <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm">
                <span>Email</span>
                <input
                  className="rounded-md border border-border px-3 py-2"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? "Đang gửi..." : "Gửi yêu cầu"}
              </Button>
            </form>
          </>
        ) : (
          <div className="mt-6 text-sm">
            <p className="text-muted-foreground">
              Nếu email <strong>{email}</strong> đã được đăng ký, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu (kiểm tra console nếu đang chạy dev).
            </p>
            <Link href="/login" className="mt-4 inline-block text-primary hover:underline">
              ← Quay lại đăng nhập
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
