"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LanguageSwitcher } from "@/components/language-switcher";
import { fetchCurrentUser, type AuthUser } from "@/lib/auth/current-user";
import { userInitials } from "@/lib/user-display";
import { cn } from "@/lib/utils";
import { useT } from "@idx/i18n";
import { SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function UserAvatar({ user }: { user: AuthUser }) {
  const label = user.displayName ?? user.email;

  return (
    <Avatar data-size="sm" className="size-8 shrink-0">
      {user.avatarUrl ? (
        <AvatarImage src={user.avatarUrl} alt={label} />
      ) : null}
      <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-medium">
        {userInitials(label)}
      </AvatarFallback>
    </Avatar>
  );
}

export function SidebarUserFooter() {
  const t = useT();
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  const languageRow = !collapsed ? (
    <div className="mb-2 flex items-center justify-between gap-2 px-1">
      <span className="text-[11px] text-muted-foreground">{t("common.language")}</span>
      <LanguageSwitcher />
    </div>
  ) : null;

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

  if (user === undefined) {
    return (
      <>
        {languageRow}
        <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="h-12" disabled>
            <div className="bg-muted size-8 shrink-0 rounded-full" />
            {!collapsed ? (
              <span className="text-muted-foreground text-xs">{t("common.loading")}</span>
            ) : null}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      </>
    );
  }

  if (!user) {
    return (
      <>
        {languageRow}
        <SidebarMenu>
        <SidebarMenuItem className="flex items-center gap-1">
          <SidebarMenuButton
            size="lg"
            className="min-w-0 flex-1"
            tooltip={collapsed ? t("nav.login") : undefined}
            asChild
          >
            <Link href="/login">
              <Avatar data-size="sm" className="size-8 shrink-0">
                <AvatarFallback className="text-xs font-medium">?</AvatarFallback>
              </Avatar>
              {!collapsed ? (
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-none">
                  <span className="truncate font-medium">{t("nav.login")}</span>
                  <span className="text-muted-foreground truncate text-xs font-normal">
                    {t("nav.loginHint")}
                  </span>
                </div>
              ) : null}
            </Link>
          </SidebarMenuButton>
          {!collapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/settings"
                    aria-label={t("nav.settings")}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon-sm" }),
                      "text-muted-foreground hover:text-foreground me-1 shrink-0",
                    )}
                  >
                    <SettingsIcon />
                  </Link>
                }
              />
              <TooltipContent side="top">{t("nav.settings")}</TooltipContent>
            </Tooltip>
          ) : null}
        </SidebarMenuItem>
      </SidebarMenu>
      </>
    );
  }

  const displayName = user.displayName ?? user.email.split("@")[0];

  return (
    <>
      {languageRow}
      <SidebarMenu>
      <SidebarMenuItem className="flex items-center gap-1">
        <SidebarMenuButton
          size="lg"
          className="min-w-0 flex-1"
          tooltip={collapsed ? displayName : undefined}
          asChild
        >
          <Link href="/settings">
            <UserAvatar user={user} />
            {!collapsed ? (
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-none">
                <span className="truncate font-medium">{displayName}</span>
                <span className="text-muted-foreground truncate text-xs font-normal">
                  {user.email}
                </span>
              </div>
            ) : null}
          </Link>
        </SidebarMenuButton>
        {!collapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/settings"
                  aria-label={t("nav.settings")}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon-sm" }),
                    "text-muted-foreground hover:text-foreground me-1 shrink-0",
                  )}
                >
                  <SettingsIcon />
                </Link>
              }
            />
            <TooltipContent side="top">{t("nav.settings")}</TooltipContent>
          </Tooltip>
        ) : null}
      </SidebarMenuItem>
    </SidebarMenu>
    </>
  );
}