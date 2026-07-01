"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ForgotPasswordView() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "done">("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setDevResetUrl(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        const token = typeof data.token === "string" ? data.token : null;
        const resetUrl = typeof data.resetUrl === "string"
          ? data.resetUrl
          : token
            ? `/dat-lai-mat-khau?token=${encodeURIComponent(token)}`
            : null;
        setDevResetUrl(resetUrl);
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
              Nhập email đã đăng ký. Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu (chỉ khi bật trên môi trường dev).
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
              Nếu email <strong>{email}</strong> đã được đăng ký, bạn sẽ nhận hướng dẫn đặt lại mật khẩu qua email.
            </p>
            {devResetUrl ? (
              <p className="mt-4 rounded-md border border-dashed p-3 text-xs">
                Dev:{" "}
                <Link href={devResetUrl} className="text-primary underline break-all">
                  {devResetUrl}
                </Link>
              </p>
            ) : null}
            <Link href="/login" className="mt-4 inline-block text-primary hover:underline">
              ← Quay lại đăng nhập
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}