"use client";

import { SidebarUserFooter } from "@/components/sidebar-user-footer";

import { BrandLogo } from "@/components/brand-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useBranding } from "@/hooks/use-branding";
import { FileText, MessageSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function VoiceFormShell({
  initialAuth,
  children,
}: {
  initialAuth: boolean;
  children: ReactNode;
}) {
  const { branding } = useBranding();
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full">
        <Sidebar>
          <SidebarHeader className="border-sidebar-border mb-2 border-b">
            <div className="px-1">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton size="lg" asChild>
                    <Link href="/chat">
                      <BrandLogo
                        src={branding.logoUrl}
                        alt={branding.appName}
                        size={32}
                        className="rounded-lg"
                      />
                      <div className="min-w-0 text-left">
                        <span className="block truncate font-semibold tracking-wide">{branding.appName}</span>
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

          <SidebarContent className="flex flex-col gap-1 px-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname?.startsWith("/chat") ?? false}>
                  <Link href="/chat">
                    <MessageSquare className="size-4" />
                    <span>Trò chuyện</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname?.startsWith("/voice-form") ?? false}>
                  <Link href="/voice-form">
                    <FileText className="size-4" />
                    <span>Điền biểu mẫu</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            {!initialAuth && (
              <p className="text-muted-foreground px-2 py-1 text-[10px]">
                <Link href="/login" className="underline">Đăng nhập</Link> để lưu tiến trình điền mẫu.
              </p>
            )}
          </SidebarContent>

          <SidebarRail />
          <SidebarFooter className="border-sidebar-border border-t px-1 py-2">
            <SidebarUserFooter />
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="min-w-0">
          <header className="flex h-12 shrink-0 items-center border-b px-4">
            <h1 className="text-sm font-semibold">Điền biểu mẫu bằng giọng nói</h1>
          </header>
          <div className="min-h-0 flex-1">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}