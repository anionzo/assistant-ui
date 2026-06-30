"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  invalidateCurrentUser,
  fetchCurrentUser,
  type AuthUser,
} from "@/lib/auth/current-user";
import { userInitials } from "@/lib/user-display";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SettingsView() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetchCurrentUser()
      .then((currentUser) => {
        if (!cancelled) setUser(currentUser);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      invalidateCurrentUser();
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 py-10">
      <Link
        href="/chat"
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeftIcon className="size-4" />
        Quay lại chat
      </Link>

      <h1 className="text-2xl font-semibold">Cài đặt</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Quản lý tài khoản và phiên đăng nhập Idx Chat.
      </p>

      {user === undefined ? (
        <div className="mt-8 rounded-xl border p-6 text-sm text-muted-foreground">
          Đang tải thông tin tài khoản...
        </div>
      ) : user ? (
        <section className="mt-8 space-y-6">
          <div className="flex items-center gap-4 rounded-xl border p-5">
            <Avatar size="lg">
              {user.avatarUrl ? (
                <AvatarImage
                  src={user.avatarUrl}
                  alt={user.displayName ?? user.email}
                />
              ) : null}
              <AvatarFallback className="font-medium">
                {userInitials(user.displayName ?? user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">
                {user.displayName ?? user.email.split("@")[0]}
              </p>
              <p className="text-muted-foreground truncate text-sm">{user.email}</p>
            </div>
          </div>

          <div className="rounded-xl border p-5">
            <h2 className="text-sm font-medium">Phiên đăng nhập</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Lịch sử chat được đồng bộ theo tài khoản này trên mọi thiết bị.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
            >
              <LogOutIcon />
              {loggingOut ? "Đang đăng xuất..." : "Đăng xuất"}
            </Button>
          </div>
        </section>
      ) : (
        <section className="mt-8 rounded-xl border p-6">
          <p className="text-sm">Bạn chưa đăng nhập.</p>
          <Link
            href="/login"
            className={cn(buttonVariants(), "mt-4 inline-flex")}
          >
            Đăng nhập
          </Link>
        </section>
      )}
    </main>
  );
}