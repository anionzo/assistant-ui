"use client";

import { SidebarUserFooter } from "@/components/sidebar-user-footer";

import { BrandLogo } from "@/components/brand-logo";
import { VoiceFormSessionSidebar } from "@/components/voice-form/voice-form-session-sidebar";
import { VoiceFormView } from "@/components/voice-form/voice-form-view";
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
import { VOICE_FORM_PAGE_ENABLED } from "@/lib/feature-flags";
import { voiceFormPath } from "@/lib/voice-form/routes";
import { useT } from "@idx/i18n";
import { VoiceFormSessionProvider } from "@/lib/voice-form/session-context";
import { FileText, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

export function VoiceFormShell({ initialAuth }: { initialAuth: boolean }) {
  const { branding } = useBranding();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();

  const urlSessionId =
    typeof params?.sessionId === "string" && params.sessionId.length > 0
      ? decodeURIComponent(params.sessionId)
      : undefined;

  const t = useT();

  useEffect(() => {
    if (!VOICE_FORM_PAGE_ENABLED) {
      router.replace("/chat");
    }
  }, [router]);

  const handleSessionIdChange = useCallback(
    (sessionId: string) => {
      const nextPath = voiceFormPath(sessionId || undefined);
      if (window.location.pathname === nextPath) return;
      router.replace(nextPath);
    },
    [router],
  );

  if (!VOICE_FORM_PAGE_ENABLED) return null;

  return (
    <VoiceFormSessionProvider
      initialAuth={initialAuth}
      urlSessionId={urlSessionId}
      onSessionIdChange={handleSessionIdChange}
    >
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

            <SidebarContent className="aui-sidebar-content flex min-h-0 flex-col gap-1 px-2">
              <SidebarMenu className="shrink-0 pt-1">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname?.startsWith("/chat") ?? false}>
                    <Link href="/chat">
                      <MessageSquare className="size-4" />
                      <span>{t("nav.chat")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname?.startsWith("/voice-form") ?? false}>
                    <Link href={voiceFormPath()}>
                      <FileText className="size-4" />
                      <span>{t("nav.voiceForm")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>

              <div className="aui-voice-form-session-list-wrapper min-h-0 flex-1 overflow-hidden">
                <VoiceFormSessionSidebar />
              </div>

              {!initialAuth && (
                <p className="text-muted-foreground shrink-0 px-2 py-1 text-[10px]">
                  <Link href="/login" className="underline">{t("nav.login")}</Link> {t("nav.guestVoiceForm")}
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
              <h1 className="text-sm font-semibold">{t("voiceForm.title")}</h1>
            </header>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <VoiceFormView />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </VoiceFormSessionProvider>
  );
}