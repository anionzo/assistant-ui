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
import { useT } from "@idx/i18n";
import { PlusIcon } from "lucide-react";

export function ChatMainHeader() {
  const t = useT();
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
              aria-label={sidebarCollapsed ? t("sidebar.show") : t("sidebar.hide")}
            />
          }
        />
        <TooltipContent side="bottom">
          {sidebarCollapsed ? t("sidebar.show") : t("sidebar.hide")}
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
                  aria-label={t("thread.newChat")}
                >
                  <PlusIcon className="size-4" />
                </ThreadListNew>
              }
            />
            <TooltipContent side="bottom">{t("thread.newChat")}</TooltipContent>
          </Tooltip>
        </div>
      ) : null}
    </header>
  );
}