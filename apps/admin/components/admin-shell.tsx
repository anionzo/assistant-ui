"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  FileStack,
  FolderOpen,
  LayoutDashboard,
  PanelRightOpen,
  Shield,
  Users,
} from "lucide-react";
import { GatewayStatus } from "@/components/gateway-status";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Collections", icon: LayoutDashboard },
  { href: "/forms", label: "Forms", icon: FileStack },
  { href: "/users", label: "Users", icon: Users },
  { href: "/roles", label: "Roles", icon: Shield },
] as const;

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col border-r border-border bg-card">
      <Link href="/" className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FolderOpen className="size-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">Idx Admin</p>
          <p className="text-xs text-muted-foreground">Operator console</p>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Main
        </p>
        {nav.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-4 py-3">
        <GatewayStatus />
      </div>
    </aside>
  );
}

export function AdminShell({
  title,
  description,
  children,
  actions,
  sidebarContent,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  sidebarContent?: ReactNode;
}) {
  const pathname = usePathname();
  const isCollectionPage = pathname.startsWith("/collections/");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        {isCollectionPage && sidebarContent ? (
          <CollectionSubNav>{sidebarContent}</CollectionSubNav>
        ) : null}
        <main className="flex-1 px-8 py-6">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {title}
                </h1>
                {description ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </p>
                ) : null}
              </div>
              {actions ? (
                <div className="flex items-center gap-2">{actions}</div>
              ) : null}
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function CollectionSubNav({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-8 py-2 text-sm">
        <PanelRightOpen className="size-3.5 shrink-0 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}
