"use client";

import { ThreadListNew } from "@/components/thread-list";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBranding } from "@/hooks/use-branding";
import { cn } from "@/lib/utils";
import { PlusIcon } from "lucide-react";

export function ChatMainHeader() {
  const { branding } = useBranding();
  const { state, isMobile } = useSidebar();
  const sidebarCollapsed = state === "collapsed" && !isMobile;
  const showNewThread = isMobile || sidebarCollapsed;

  return (
    <header
      className={cn(
        "border-border flex h-11 shrink-0 items-center gap-2 border-b px-3",
        sidebarCollapsed ? "md:bg-background/80 md:backdrop-blur-sm" : "",
      )}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <SidebarTrigger
              className="size-8 shrink-0"
              aria-label={sidebarCollapsed ? "Hiện thanh bên" : "Ẩn thanh bên"}
            />
          }
        />
        <TooltipContent side="bottom">
          {sidebarCollapsed ? "Hiện thanh bên" : "Ẩn thanh bên"}
        </TooltipContent>
      </Tooltip>
      <span className="truncate text-sm font-semibold tracking-wide md:hidden">
        {branding.appName}
      </span>
      {sidebarCollapsed ? (
        <span className="text-muted-foreground hidden truncate text-sm font-semibold tracking-wide md:inline">
          {branding.appName}
        </span>
      ) : null}
      {showNewThread ? (
        <div className="ms-auto flex items-center">
          <Tooltip>
            <TooltipTrigger
              render={
                <ThreadListNew
                  size="icon-sm"
                  className="size-8 shrink-0 px-0"
                  aria-label="Cuộc trò chuyện mới"
                >
                  <PlusIcon className="size-4" />
                </ThreadListNew>
              }
            />
            <TooltipContent side="bottom">Cuộc trò chuyện mới</TooltipContent>
          </Tooltip>
        </div>
      ) : null}
    </header>
  );
}