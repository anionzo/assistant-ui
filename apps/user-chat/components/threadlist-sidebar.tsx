"use client";

import { SidebarUserFooter } from "@/components/sidebar-user-footer";
import { ThreadListItems, ThreadListNew } from "@/components/thread-list";
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
import { BrandLogo } from "@/components/brand-logo";
import { useBranding } from "@/hooks/use-branding";
import Link from "next/link";
import type { ComponentProps } from "react";

export function ThreadListSidebar({
  initialAuth = true,
  ...props
}: ComponentProps<typeof Sidebar> & { initialAuth?: boolean }) {
  const { branding } = useBranding();

  return (
    <Sidebar {...props}>
      <SidebarHeader className="aui-sidebar-header border-sidebar-border mb-2 border-b">
        <div className="aui-sidebar-header-content px-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/chat">
                  <BrandLogo
                    src={branding.logoUrl}
                    alt={branding.appName}
                    size={32}
                    className="aui-sidebar-header-icon-wrapper rounded-lg"
                  />
                  <div className="min-w-0 text-left">
                    <span className="aui-sidebar-header-title block truncate font-semibold tracking-wide">
                      {branding.appName}
                    </span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      {branding.tagline}
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarHeader>

      <SidebarContent className="aui-sidebar-content flex min-h-0 flex-col gap-1 px-2">
        <div className="aui-sidebar-new-thread shrink-0 pt-1">
          <ThreadListNew className="w-full" />
        </div>
        {!initialAuth && (
          <div className="text-muted-foreground px-2 py-1 text-[10px]">
            Chế độ khách — trò chuyện không được lưu.{" "}
            <Link href="/login" className="underline">Đăng nhập</Link> để lưu lại.
          </div>
        )}
        <div className="aui-sidebar-thread-list min-h-0 flex-1 overflow-auto">
          <ThreadListItems />
        </div>
      </SidebarContent>

      <SidebarRail />

      <SidebarFooter className="aui-sidebar-footer border-sidebar-border border-t px-1 py-2">
        <SidebarUserFooter />
      </SidebarFooter>
    </Sidebar>
  );
}