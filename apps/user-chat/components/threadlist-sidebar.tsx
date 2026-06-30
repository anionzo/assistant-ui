"use client";

import { ThreadList } from "@/components/thread-list";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { MessagesSquare } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ComponentProps } from "react";

type AuthUser = {
  email: string;
  displayName?: string | null;
};

export function ThreadListSidebar({
  ...props
}: ComponentProps<typeof Sidebar>) {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { user?: AuthUser } | null) => {
        if (!cancelled) setUser(data?.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Sidebar {...props}>
      <SidebarHeader className="aui-sidebar-header border-sidebar-border mb-2 border-b">
        <div className="aui-sidebar-header-content flex items-center justify-between">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/chat">
                  <div className="aui-sidebar-header-icon-wrapper bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <MessagesSquare className="aui-sidebar-header-icon size-4" />
                  </div>
                  <div className="aui-sidebar-header-heading flex flex-col gap-0.5 leading-none">
                    <span className="aui-sidebar-header-title font-semibold">
                      Idx Chat
                    </span>
                    <span className="text-muted-foreground text-xs font-normal">
                      ModularRAG Assistant
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarHeader>

      <SidebarContent className="aui-sidebar-content px-2">
        <ThreadList />
      </SidebarContent>

      <SidebarRail />

      <SidebarFooter className="aui-sidebar-footer border-sidebar-border border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="h-auto items-start py-2">
              <div className="text-muted-foreground flex flex-col gap-0.5 text-xs leading-relaxed">
                {user ? (
                  <>
                    <span className="text-sidebar-foreground font-medium">
                      {user.displayName ?? user.email}
                    </span>
                    <span>Lịch sử được đồng bộ theo tài khoản</span>
                  </>
                ) : user === undefined ? null : (
                  <>
                    <Link
                      href="/login"
                      className="text-sidebar-foreground font-medium underline-offset-4 hover:underline"
                    >
                      Đăng nhập
                    </Link>
                    <span>để lưu và đồng bộ cuộc trò chuyện giữa các thiết bị.</span>
                  </>
                )}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}