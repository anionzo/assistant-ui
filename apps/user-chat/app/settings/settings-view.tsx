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
import { useT } from "@idx/i18n";
import { ArrowLeftIcon, LogOutIcon, SaveIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SettingsView() {
  const t = useT();
  const router = useRouter();
  const deleteWord = t("settings.deleteConfirmWord");
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
        setProfileMsg(t("settings.updated"));
        invalidateCurrentUser();
      } else {
        setProfileMsg(typeof data.error === "string" ? data.error : t("common.error"));
      }
    } catch {
      setProfileMsg(t("common.connectionError"));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPwMsg(t("settings.passwordMin8"));
      return;
    }

    const hasPassword = user?.hasPassword ?? true;
    if (hasPassword && !oldPassword) {
      setPwMsg(t("settings.enterCurrentPassword"));
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
        setPwMsg(hasPassword ? t("settings.passwordChanged") : t("settings.passwordSet"));
        setOldPassword("");
        setNewPassword("");
        invalidateCurrentUser();
        setUser((prev) => (prev ? { ...prev, hasPassword: true } : prev));
      } else {
        setPwMsg(typeof data.error === "string" ? data.error : t("common.error"));
      }
    } catch {
      setPwMsg(t("common.connectionError"));
    } finally {
      setChangingPw(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== deleteWord) {
      setDeleteMsg(t("settings.deleteConfirmHint"));
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
      setDeleteMsg(typeof data.error === "string" ? data.error : t("settings.deleteFailed"));
    } catch {
      setDeleteMsg(t("common.connectionError"));
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
        {t("common.back")}
      </Link>

      <h1 className="text-2xl font-semibold">{t("settings.title")}</h1>
      <p className="text-muted-foreground mt-2 text-sm">{t("settings.subtitle")}</p>

      {user === undefined ? (
        <div className="mt-8 rounded-xl border p-6 text-sm text-muted-foreground">
          {t("common.loading")}
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
            <h2 className="text-sm font-medium">{t("settings.profile")}</h2>
            <label className="flex flex-col gap-1 text-sm">
              <span>{t("settings.displayName")}</span>
              <input
                className="w-full rounded-md border border-border px-3 py-2"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
            {profileMsg ? <p className="text-xs text-muted-foreground">{profileMsg}</p> : null}
            <Button type="submit" variant="outline" size="sm" disabled={savingProfile}>
              <SaveIcon className="size-3.5" />
              {savingProfile ? t("common.saving") : t("common.save")}
            </Button>
          </form>

          <form onSubmit={(e) => void handlePasswordSubmit(e)} className="rounded-xl border p-5 space-y-3">
            <h2 className="text-sm font-medium">{t("settings.password")}</h2>
            {!hasPassword ? (
              <p className="text-xs text-muted-foreground">{t("settings.googleHint")}</p>
            ) : null}
            {hasPassword ? (
              <label className="flex flex-col gap-1 text-sm">
                <span>{t("settings.currentPassword")}</span>
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
              <span>{hasPassword ? t("settings.newPassword") : t("common.password")}</span>
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
              {changingPw
                ? t("common.processing")
                : hasPassword
                  ? t("settings.changePassword")
                  : t("settings.setPassword")}
            </Button>
          </form>

          <ArchivedThreadsSection />

          <div className="rounded-xl border p-5">
            <h2 className="text-sm font-medium">{t("settings.session")}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{t("settings.sessionHint")}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
            >
              <LogOutIcon />
              {loggingOut ? t("settings.loggingOut") : t("settings.logout")}
            </Button>
          </div>

          <div className="rounded-xl border border-destructive/30 p-5 lg:col-span-full">
            <h2 className="text-sm font-medium text-destructive">{t("settings.dangerZone")}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{t("settings.deleteWarning")}</p>
            <label className="mt-4 flex flex-col gap-1 text-sm">
              <span>{t("settings.deleteConfirmLabel", { word: deleteWord })}</span>
              <input
                className="w-full max-w-xs rounded-md border border-border px-3 py-2"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={deleteWord}
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
              {deleting ? t("settings.deleting") : t("settings.deleteAccount")}
            </Button>
          </div>
        </section>
      ) : (
        <section className="mt-8 rounded-xl border p-6">
          <p className="text-sm">{t("settings.notSignedIn")}</p>
          <Link href="/login" className={cn(buttonVariants(), "mt-4 inline-flex")}>
            {t("auth.login")}
          </Link>
        </section>
      )}
    </main>
  );
}