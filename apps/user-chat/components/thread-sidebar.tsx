"use client";

import { ThreadList } from "@/components/thread-list";
import Link from "next/link";
import { useEffect, useState } from "react";

type AuthUser = {
  email: string;
  displayName?: string | null;
};

export function ThreadSidebar() {
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
    <aside className="border-border bg-background/80 hidden w-72 shrink-0 border-r md:flex md:flex-col">
      <div className="border-border border-b px-4 py-3">
        <Link
          href="/chat"
          className="hover:text-foreground/80 text-foreground block text-sm font-semibold transition-colors"
        >
          Idx Chat
        </Link>
        <div className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
          {user ? (
            "Lịch sử được đồng bộ theo tài khoản"
          ) : user === undefined ? null : (
            <>
              <Link
                href="/login"
                className="text-foreground font-medium underline-offset-4 hover:underline"
              >
                Đăng nhập
              </Link>{" "}
              để lưu và đồng bộ cuộc trò chuyện giữa các thiết bị.
            </>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 p-2">
        <ThreadList />
      </div>
    </aside>
  );
}