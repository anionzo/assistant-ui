"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ThreadListItemMorePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArchiveIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { useMinimumLoading } from "@/lib/use-minimum-loading";
import { useT } from "@idx/i18n";
import {
  forwardRef,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type FC,
} from "react";

export const ThreadList: FC = () => {
  return (
    <ThreadListRoot>
      <ThreadListNew />
      <ThreadListItems />
    </ThreadListRoot>
  );
};

export const ThreadListRoot: FC<
  ComponentPropsWithoutRef<typeof ThreadListPrimitive.Root>
> = ({ className, ...props }) => {
  return (
    <ThreadListPrimitive.Root
      data-slot="aui_thread-list-root"
      className={cn("flex flex-col gap-0.5", className)}
      {...props}
    />
  );
};

function ThreadListItemsBody() {
  const loading = useAuiState((s) => s.threads.isLoading);
  const showSkeleton = useMinimumLoading(loading, 280);

  if (showSkeleton) return <ThreadListSkeleton />;

  return (
    <div className="animate-in fade-in flex flex-col gap-0.5 duration-200">
      <ThreadListItemGroups />
    </div>
  );
}

export const ThreadListItems: FC<ComponentPropsWithoutRef<"div">> = ({
  className,
  ...props
}) => {
  return (
    <div
      data-slot="aui_thread-list-items"
      className={cn("flex flex-col gap-0.5", className)}
      {...props}
    >
      <ThreadListItemsBody />
    </div>
  );
};

const DAY_IN_MS = 86_400_000;

const dateGroupLabel = (
  date: Date | undefined,
  startOfToday: number,
  t: (key: string) => string,
): string => {
  if (!date || date.getTime() >= startOfToday) return t("thread.today");
  if (date.getTime() >= startOfToday - DAY_IN_MS) return t("thread.yesterday");
  return t("thread.older");
};

type ThreadListGroup = { label: string; indices: number[] };

const ThreadListItemGroups: FC = () => {
  const t = useT();
  const threadIds = useAuiState((s) => s.threads.threadIds);
  const threadItems = useAuiState((s) => s.threads.threadItems);

  const groups = useMemo<ThreadListGroup[] | null>(() => {
    const itemsById = new Map(threadItems.map((item) => [item.id, item]));
    const dates = threadIds.map((id) => itemsById.get(id)?.lastMessageAt);
    if (!dates.some(Boolean)) return null;

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const time = (index: number) =>
      dates[index]?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const indices = threadIds
      .map((_, index) => index)
      .sort((a, b) => time(b) - time(a));

    const result: ThreadListGroup[] = [];
    for (const index of indices) {
      const label = dateGroupLabel(dates[index], startOfToday, t);
      const lastGroup = result[result.length - 1];
      if (lastGroup?.label === label) {
        lastGroup.indices.push(index);
      } else {
        result.push({ label, indices: [index] });
      }
    }
    return result;
  }, [threadIds, threadItems, t]);

  if (!groups) {
    return (
      <ThreadListPrimitive.Items>
        {() => <ThreadListItem />}
      </ThreadListPrimitive.Items>
    );
  }

  return groups.map((group) => (
    <Fragment key={group.label}>
      <div
        data-slot="aui_thread-list-group-label"
        className="text-muted-foreground px-2.5 pt-3 pb-1 text-xs font-medium"
      >
        {group.label}
      </div>
      {group.indices.map((index) => (
        <ThreadListPrimitive.ItemByIndex
          key={threadIds[index]}
          index={index}
          components={{ ThreadListItem }}
        />
      ))}
    </Fragment>
  ));
};

export const ThreadListNew = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof Button> & { labelClassName?: string }
>(({ className, labelClassName, children, onClick, ...props }, ref) => {
  const t = useT();
  const aui = useAui();
  const isMain = useAuiState(
    (s) => s.threads.newThreadId === s.threads.mainThreadId,
  );

  const handleNewThread = () => {
    void aui.threads().switchToNewThread();
  };

  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      data-slot="aui_thread-list-new"
      className={cn(
        "hover:bg-muted data-active:bg-muted h-8 justify-start gap-2 rounded-md px-2.5 text-sm font-normal",
        className,
      )}
      {...(isMain ? { "data-active": "true", "aria-current": "page" } : null)}
      onClick={(event) => {
        onClick?.(event);
        handleNewThread();
      }}
      {...props}
    >
      {children ?? (
        <>
          <PlusIcon
            data-slot="aui_thread-list-new-icon"
            className="size-4 shrink-0"
          />
          <span
            data-slot="aui_thread-list-new-label"
            className={cn("whitespace-nowrap", labelClassName)}
          >
            {t("thread.new")}
          </span>
        </>
      )}
    </Button>
  );
});

ThreadListNew.displayName = "ThreadListNew";

const ThreadListSkeleton: FC = () => {
  const t = useT();
  return (
    <div className="flex flex-col gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          role="status"
          aria-label={t("thread.loadingList")}
          data-slot="aui_thread-list-skeleton-wrapper"
          className="flex h-8 items-center px-2.5"
        >
          <Skeleton
            data-slot="aui_thread-list-skeleton"
            className="h-3.5 w-full"
          />
        </div>
      ))}
    </div>
  );
};

export const ThreadListItem: FC = () => {
  const t = useT();
  const aui = useAui();
  const title = useAuiState((s) => s.threadListItem.title);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayTitle = title?.trim() || t("thread.new");

  const startEditing = useCallback(() => {
    setDraft(displayTitle);
    setEditing(true);
  }, [displayTitle]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setDraft("");
  }, []);

  const commitRename = useCallback(async () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed || trimmed === displayTitle) return;

    setRenaming(true);
    try {
      await aui.threadListItem().rename(trimmed);
    } catch (error) {
      console.warn("[thread-list] rename failed", error);
    } finally {
      setRenaming(false);
    }
  }, [aui, displayTitle, draft]);

  return (
    <ThreadListItemPrimitive.Root
      data-slot="aui_thread-list-item"
      className="group hover:bg-muted focus-visible:bg-muted data-active:bg-muted has-focus-visible:bg-muted has-data-[state=open]:bg-muted relative flex h-8 items-center rounded-md transition-colors focus-visible:outline-none"
    >
      {editing ? (
        <Input
          ref={inputRef}
          value={draft}
          disabled={renaming}
          data-slot="aui_thread-list-item-rename"
          className="h-7 min-w-0 flex-1 rounded-md px-2.5 text-sm shadow-none"
          aria-label={t("thread.renameThread")}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commitRename()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commitRename();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelEditing();
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <ThreadListItemPrimitive.Trigger
          data-slot="aui_thread-list-item-trigger"
          className="focus-visible:ring-ring/50 flex h-full min-w-0 flex-1 items-center rounded-md px-2.5 text-start text-sm outline-none group-hover:pe-9 group-has-focus-visible:pe-9 group-has-data-[state=open]:pe-9 group-data-active:pe-9 focus-visible:ring-[3px]"
          onDoubleClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startEditing();
          }}
        >
          <span
            data-slot="aui_thread-list-item-title"
            className="min-w-0 flex-1 truncate"
            title={displayTitle}
          >
            <ThreadListItemPrimitive.Title fallback={t("thread.new")} />
          </span>
        </ThreadListItemPrimitive.Trigger>
      )}
      {!editing && <ThreadListItemMore onRename={startEditing} />}
    </ThreadListItemPrimitive.Root>
  );
};

const ThreadListItemMore: FC<{ onRename: () => void }> = ({ onRename }) => {
  const t = useT();
  return (
    <ThreadListItemMorePrimitive.Root>
      <ThreadListItemMorePrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-slot="aui_thread-list-item-more"
          className="data-[state=open]:bg-accent absolute end-1.5 top-1/2 size-6 -translate-y-1/2 p-0 opacity-0 group-hover:opacity-100 group-has-focus-visible:opacity-100 group-data-active:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreHorizontalIcon className="size-3.5" />
          <span className="sr-only">{t("thread.options")}</span>
        </Button>
      </ThreadListItemMorePrimitive.Trigger>
      <ThreadListItemMorePrimitive.Content
        side="right"
        align="start"
        sideOffset={6}
        data-slot="aui_thread-list-item-more-content"
        className="bg-popover/95 text-popover-foreground data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-32 overflow-hidden rounded-xl border p-1.5 shadow-lg backdrop-blur-sm"
      >
        <ThreadListItemMorePrimitive.Item
          data-slot="aui_thread-list-item-more-item"
          className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none"
          onSelect={() => {
            // Defer so the dropdown can close before the input mounts/focuses.
            requestAnimationFrame(() => onRename());
          }}
        >
          <PencilIcon className="size-4" />
          {t("thread.rename")}
        </ThreadListItemMorePrimitive.Item>
        <ThreadListItemPrimitive.Archive asChild>
          <ThreadListItemMorePrimitive.Item
            data-slot="aui_thread-list-item-more-item"
            className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none"
          >
            <ArchiveIcon className="size-4" />
            {t("thread.archive")}
          </ThreadListItemMorePrimitive.Item>
        </ThreadListItemPrimitive.Archive>
        <ThreadListItemPrimitive.Delete asChild>
          <ThreadListItemMorePrimitive.Item
            data-slot="aui_thread-list-item-more-item"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none"
          >
            <TrashIcon className="size-4" />
            {t("thread.delete")}
          </ThreadListItemMorePrimitive.Item>
        </ThreadListItemPrimitive.Delete>
      </ThreadListItemMorePrimitive.Content>
    </ThreadListItemMorePrimitive.Root>
  );
};