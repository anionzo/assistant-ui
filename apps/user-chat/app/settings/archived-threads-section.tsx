"use client";

import { Button } from "@/components/ui/button";
import { chatPath } from "@/lib/chat-routes";
import {
  deleteThread,
  fetchThreadList,
  unarchiveThread,
  type ThreadDto,
} from "@/lib/thread-api-client";
import { ArchiveRestoreIcon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function formatArchivedDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return "";

  return date.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ArchivedThreadsSection() {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadDto[] | undefined>(undefined);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadArchived = useCallback(async () => {
    setError(null);
    try {
      const result = await fetchThreadList();
      setThreads(result.threads.filter((thread) => thread.archived));
    } catch {
      setThreads([]);
      setError("Không thể tải danh sách đã lưu trữ.");
    }
  }, []);

  useEffect(() => {
    void loadArchived();
  }, [loadArchived]);

  async function handleUnarchive(thread: ThreadDto) {
    setBusyId(thread.id);
    setError(null);
    try {
      await unarchiveThread(thread.id);
      setThreads((current) => current?.filter((item) => item.id !== thread.id));
      router.push(chatPath(thread.id));
    } catch {
      setError("Không thể mở lại cuộc trò chuyện. Vui lòng thử lại.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(thread: ThreadDto) {
    const confirmed = window.confirm(
      `Xóa vĩnh viễn "${thread.title}"? Hành động này không thể hoàn tác.`,
    );
    if (!confirmed) return;

    setBusyId(thread.id);
    setError(null);
    try {
      await deleteThread(thread.id);
      setThreads((current) => current?.filter((item) => item.id !== thread.id));
    } catch {
      setError("Không thể xóa cuộc trò chuyện. Vui lòng thử lại.");
    } finally {
      setBusyId(null);
    }
  }

  if (threads === undefined) {
    return (
      <div className="rounded-xl border p-5 text-sm text-muted-foreground">
        Đang tải cuộc trò chuyện đã lưu trữ...
      </div>
    );
  }

  return (
    <section className="rounded-xl border p-5">
      <h2 className="text-sm font-medium">Đã lưu trữ</h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Các cuộc trò chuyện đã lưu trữ từ thanh bên. Mở lại để tiếp tục hoặc xóa
        vĩnh viễn.
      </p>

      {error ? (
        <p className="text-destructive mt-3 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {threads.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm">
          Chưa có cuộc trò chuyện nào được lưu trữ.
        </p>
      ) : (
        <ul className="mt-4 divide-y rounded-lg border">
          {threads.map((thread) => {
            const isBusy = busyId === thread.id;

            return (
              <li
                key={thread.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{thread.title}</p>
                  <p className="text-muted-foreground text-xs">
                    Lưu trữ · {formatArchivedDate(thread.updatedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => void handleUnarchive(thread)}
                  >
                    <ArchiveRestoreIcon />
                    Mở lại
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => void handleDelete(thread)}
                  >
                    <TrashIcon />
                    Xóa
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-muted-foreground mt-4 text-xs">
        Để lưu trữ cuộc trò chuyện mới, dùng menu{" "}
        <span className="text-foreground font-medium">⋯</span> bên cạnh từng mục
        trong{" "}
        <Link href="/chat" className="text-foreground underline-offset-4 hover:underline">
          thanh bên chat
        </Link>
        .
      </p>
    </section>
  );
}