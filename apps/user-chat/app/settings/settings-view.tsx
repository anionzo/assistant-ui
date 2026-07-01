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
import { ArrowLeftIcon, LogOutIcon, SaveIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SettingsView() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteMsg, setDeleteMsg] = useState("");

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

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPwMsg("Mật khẩu tối thiểu 8 ký tự.");
      return;
    }

    const hasPassword = user?.hasPassword ?? true;
    if (hasPassword && !oldPassword) {
      setPwMsg("Nhập mật khẩu hiện tại.");
      return;
    }

    setPwMsg("");
    setChangingPw(true);
    try {
      const endpoint = hasPassword ? "/api/auth/change-password" : "/api/auth/set-password";
      const body = hasPassword
        ? { oldPassword, newPassword }
        : { password: newPassword };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPwMsg(hasPassword ? "Đã đổi mật khẩu." : "Đã đặt mật khẩu.");
        setOldPassword("");
        setNewPassword("");
        invalidateCurrentUser();
        setUser((prev) => (prev ? { ...prev, hasPassword: true } : prev));
      } else {
        setPwMsg(typeof data.error === "string" ? data.error : "Lỗi.");
      }
    } catch {
      setPwMsg("Lỗi kết nối.");
    } finally {
      setChangingPw(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== "XÓA") {
      setDeleteMsg('Gõ "XÓA" để xác nhận.');
      return;
    }

    setDeleteMsg("");
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/account", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        invalidateCurrentUser();
        router.push("/login");
        router.refresh();
        return;
      }
      setDeleteMsg(typeof data.error === "string" ? data.error : "Không thể xóa tài khoản.");
    } catch {
      setDeleteMsg("Lỗi kết nối.");
    } finally {
      setDeleting(false);
    }
  }

  const hasPassword = user?.hasPassword ?? true;

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

          <form onSubmit={(e) => void handlePasswordSubmit(e)} className="rounded-xl border p-5 space-y-3">
            <h2 className="text-sm font-medium">Mật khẩu</h2>
            {!hasPassword ? (
              <p className="text-xs text-muted-foreground">
                Tài khoản Google — đặt mật khẩu để đăng nhập bằng email.
              </p>
            ) : null}
            {hasPassword ? (
              <label className="flex flex-col gap-1 text-sm">
                <span>Mật khẩu hiện tại</span>
                <input
                  className="w-full rounded-md border border-border px-3 py-2"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </label>
            ) : null}
            <label className="flex flex-col gap-1 text-sm">
              <span>{hasPassword ? "Mật khẩu mới" : "Mật khẩu"}</span>
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
              {changingPw ? "Đang xử lý..." : hasPassword ? "Đổi mật khẩu" : "Đặt mật khẩu"}
            </Button>
          </form>

          <ArchivedThreadsSection />

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

          <div className="rounded-xl border border-destructive/30 p-5 lg:col-span-full">
            <h2 className="text-sm font-medium text-destructive">Vùng nguy hiểm</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Xóa tài khoản sẽ xóa vĩnh viễn lịch sử chat và không thể hoàn tác.
            </p>
            <label className="mt-4 flex flex-col gap-1 text-sm">
              <span>Gõ <strong>XÓA</strong> để xác nhận</span>
              <input
                className="w-full max-w-xs rounded-md border border-border px-3 py-2"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="XÓA"
              />
            </label>
            {deleteMsg ? <p className="mt-2 text-xs text-destructive">{deleteMsg}</p> : null}
            <Button
              variant="destructive"
              className="mt-4"
              onClick={() => void handleDeleteAccount()}
              disabled={deleting}
            >
              <Trash2Icon />
              {deleting ? "Đang xóa..." : "Xóa tài khoản"}
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