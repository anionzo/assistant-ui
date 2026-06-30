"use client";

import { ArchivedThreadsSection } from "@/app/settings/archived-threads-section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  invalidateCurrentUser,
  fetchCurrentUser,
  type AuthUser,
} from "@/lib/auth/current-user";
import { userInitials } from "@/lib/user-display";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, LogOutIcon, SaveIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SettingsView() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  // Password
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  // Logout
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchCurrentUser()
      .then((currentUser) => {
        if (!cancelled) {
          setUser(currentUser);
          if (currentUser) setDisplayName(currentUser.displayName ?? "");
        }
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => { cancelled = true; };
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

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg("");
    setSavingProfile(true);
    try {
      const res = await fetch("/api/auth/me");
      const session = await res.json().catch(() => null);
      const token = res.headers.get("set-cookie"); // won't work, need another approach

      // Call auth-api directly via BFF proxy
      const r = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() || null }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        setProfileMsg("Đã cập nhật.");
        invalidateCurrentUser();
      } else {
        setProfileMsg(typeof data.error === "string" ? data.error : "Lỗi.");
      }
    } catch {
      setProfileMsg("Lỗi kết nối.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) { setPwMsg("Mật khẩu tối thiểu 8 ký tự."); return; }
    setPwMsg("");
    setChangingPw(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPwMsg("Đã đổi mật khẩu.");
        setOldPassword("");
        setNewPassword("");
      } else {
        setPwMsg(typeof data.error === "string" ? data.error : "Lỗi.");
      }
    } catch {
      setPwMsg("Lỗi kết nối.");
    } finally {
      setChangingPw(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-6 py-10">
      <Link
        href="/chat"
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeftIcon className="size-4" />
        Quay lại
      </Link>

      <h1 className="text-2xl font-semibold">Cài đặt</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Quản lý tài khoản của bạn.
      </p>

      {user === undefined ? (
        <div className="mt-8 rounded-xl border p-6 text-sm text-muted-foreground">
          Đang tải...
        </div>
      ) : user ? (
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Thông tin */}
          <div className="flex items-center gap-4 rounded-xl border p-5 lg:col-span-full">
            <Avatar size="lg">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.displayName ?? user.email} /> : null}
              <AvatarFallback className="font-medium">
                {userInitials(user.displayName ?? user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium">{user.displayName ?? user.email.split("@")[0]}</p>
              <p className="text-muted-foreground truncate text-sm">{user.email}</p>
            </div>
          </div>

          {/* Cập nhật tên */}
          <form onSubmit={(e) => void handleSaveProfile(e)} className="rounded-xl border p-5 space-y-3">
            <h2 className="text-sm font-medium">Cập nhật thông tin</h2>
            <label className="flex flex-col gap-1 text-sm">
              <span>Tên hiển thị</span>
              <input
                className="w-full rounded-md border border-border px-3 py-2"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
            {profileMsg ? <p className="text-xs text-muted-foreground">{profileMsg}</p> : null}
            <Button type="submit" variant="outline" size="sm" disabled={savingProfile}>
              <SaveIcon className="size-3.5" />
              {savingProfile ? "Đang lưu..." : "Lưu"}
            </Button>
          </form>

          {/* Đổi mật khẩu / Đặt mật khẩu */}
          <form onSubmit={(e) => void handleChangePassword(e)} className="rounded-xl border p-5 space-y-3">
            <h2 className="text-sm font-medium">Mật khẩu</h2>
            <label className="flex flex-col gap-1 text-sm">
              <span>Mật khẩu hiện tại</span>
              <input
                className="w-full rounded-md border border-border px-3 py-2"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Để trống nếu đăng nhập bằng Google"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>Mật khẩu mới</span>
              <input
                className="w-full rounded-md border border-border px-3 py-2"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </label>
            {pwMsg ? <p className="text-xs text-muted-foreground">{pwMsg}</p> : null}
            <Button type="submit" variant="outline" size="sm" disabled={changingPw}>
              {changingPw ? "Đang xử lý..." : "Đổi mật khẩu"}
            </Button>
          </form>

          <ArchivedThreadsSection />

          {/* Phiên đăng nhập */}
          <div className="rounded-xl border p-5">
            <h2 className="text-sm font-medium">Phiên đăng nhập</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Lịch sử chat được đồng bộ trên mọi thiết bị.
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
          <Link href="/login" className={cn(buttonVariants(), "mt-4 inline-flex")}>
            Đăng nhập
          </Link>
        </section>
      )}
    </main>
  );
}