"use client";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function ChatMainHeader() {
  const { state, isMobile } = useSidebar();
  const sidebarCollapsed = state === "collapsed" && !isMobile;

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
      <span className="text-sm font-semibold tracking-wide uppercase md:hidden">
        IDX CHAT
      </span>
      {sidebarCollapsed ? (
        <span className="text-muted-foreground hidden text-sm font-semibold tracking-wide uppercase md:inline">
          IDX CHAT
        </span>
      ) : null}
    </header>
  );
}