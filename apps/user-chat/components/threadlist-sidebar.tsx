"use client";

import { SidebarUserFooter } from "@/components/sidebar-user-footer";
import { ThreadList } from "@/components/thread-list";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MessagesSquare, PanelLeftCloseIcon } from "lucide-react";
import Link from "next/link";
import type { ComponentProps } from "react";

function SidebarCollapseButton() {
  const { toggleSidebar, isMobile } = useSidebar();

  if (isMobile) return null;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground shrink-0"
            onClick={toggleSidebar}
            aria-label="Thu gọn thanh bên"
          >
            <PanelLeftCloseIcon />
          </Button>
        }
      />
      <TooltipContent side="bottom">Thu gọn thanh bên</TooltipContent>
    </Tooltip>
  );
}

export function ThreadListSidebar({
  ...props
}: ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader className="aui-sidebar-header border-sidebar-border mb-2 border-b">
        <div className="aui-sidebar-header-content flex items-center gap-1 px-1">
          <SidebarMenu className="min-w-0 flex-1">
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
          <SidebarCollapseButton />
        </div>
      </SidebarHeader>

      <SidebarContent className="aui-sidebar-content px-2">
        <ThreadList />
      </SidebarContent>

      <SidebarRail />

      <SidebarFooter className="aui-sidebar-footer border-sidebar-border border-t px-1 py-2">
        <SidebarUserFooter />
      </SidebarFooter>
    </Sidebar>
  );
}