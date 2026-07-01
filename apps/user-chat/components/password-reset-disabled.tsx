import Link from "next/link";

export function PasswordResetDisabled({ title }: { title: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Tính năng tự đặt lại mật khẩu qua email hiện chưa được bật. Vui lòng đăng nhập bằng Google
          hoặc liên hệ quản trị viên để được hỗ trợ.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm text-primary hover:underline">
          ← Quay lại đăng nhập
        </Link>
      </div>
    </main>
  );
}