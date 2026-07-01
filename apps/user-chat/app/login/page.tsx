import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Đăng nhập</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Đăng nhập để đồng bộ lịch sử trên mọi thiết bị.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Chưa có tài khoản? <Link href="/register" className="text-primary underline">Đăng ký</Link>
        </p>
      </div>
    </main>
  );
}
