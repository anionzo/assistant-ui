"use client";

import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { useAdminMe } from "@/hooks/use-admin-me";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function initials(email: string, displayName: string | null) {
  if (displayName?.trim()) {
    return displayName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }
  return email.slice(0, 2).toUpperCase();
}

function formatRoleName(name: string) {
  return name
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function displayLabel(user: { email: string; displayName: string | null }) {
  const name = user.displayName?.trim();
  if (name && name.toLowerCase() !== user.email.toLowerCase()) return name;
  const local = user.email.split("@")[0] ?? user.email;
  return local.replace(/[._-]+/g, " ").trim() || user.email;
}

export function AdminUserMenu({ className }: { className?: string }) {
  const { me, loading, canManageIpAllowlist } = useAdminMe();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <div className={cn("px-1 py-2", className)}>
        <p className="text-xs text-muted-foreground">Đang tải…</p>
      </div>
    );
  }

  if (!me) {
    return (
      <div className={cn("px-1 py-2", className)}>
        <p className="text-xs text-muted-foreground">Chưa đăng nhập</p>
      </div>
    );
  }

  const label = displayLabel(me.user);
  const showEmail = me.user.displayName?.trim() && me.user.displayName.trim().toLowerCase() !== me.user.email.toLowerCase();
  const primaryRole = me.roles.find((role) => role.id === 6) ?? me.roles.find((role) => role.id === 1) ?? me.roles[0];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2.5">
        {me.user.avatarUrl ? (
          <img
            src={me.user.avatarUrl}
            alt={label}
            className="size-9 shrink-0 rounded-full border border-border object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials(me.user.email, me.user.displayName)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">{label}</p>
          <p className="truncate text-[11px] text-muted-foreground leading-tight">
            {showEmail ? me.user.email : primaryRole ? formatRoleName(primaryRole.name) : "Admin"}
          </p>
        </div>
      </div>

      {me.roles.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {me.roles.map((role) => (
            <Badge key={role.id} tone={role.id === 1 || role.id === 6 ? "success" : "default"} className="text-[10px]">
              {formatRoleName(role.name)}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="flex gap-1.5">
        {canManageIpAllowlist ? (
          <Link
            href="/settings/security"
            className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-md border border-border px-2 text-[11px] font-medium hover:bg-muted"
          >
            <Settings className="size-3" />
            IP
          </Link>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 flex-1 gap-1 px-2 text-[11px]"
          onClick={() => void logout()}
        >
          <LogOut className="size-3" />
          Thoát
        </Button>
      </div>
    </div>
  );
}