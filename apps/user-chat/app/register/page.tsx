import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Tạo tài khoản</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tạo tài khoản để lưu và đồng bộ cuộc trò chuyện.
        </p>
        <div className="mt-6">
          <RegisterForm />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Đã có tài khoản? <Link href="/login" className="text-primary underline">Đăng nhập</Link>
        </p>
      </div>
    </main>
  );
}
