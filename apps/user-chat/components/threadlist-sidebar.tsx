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
import { MessagesSquare } from "lucide-react";
import Link from "next/link";
import type { ComponentProps } from "react";

export function ThreadListSidebar({
  initialAuth = true,
  ...props
}: ComponentProps<typeof Sidebar> & { initialAuth?: boolean }) {
  return (
    <Sidebar {...props}>
      <SidebarHeader className="aui-sidebar-header border-sidebar-border mb-2 border-b">
        <div className="aui-sidebar-header-content px-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/chat">
                  <div className="aui-sidebar-header-icon-wrapper bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <MessagesSquare className="aui-sidebar-header-icon size-4" />
                  </div>
                  <span className="aui-sidebar-header-title font-semibold tracking-wide uppercase">
                    IDX CHAT
                  </span>
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
            Guest mode — chats not saved.{" "}
            <Link href="/login" className="underline">Log in</Link> to persist.
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