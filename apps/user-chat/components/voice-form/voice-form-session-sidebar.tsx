"use client";

import { TooltipIconButton } from "@/components/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { voiceFormPath } from "@/lib/voice-form/routes";
import { formatConvLabel } from "@/lib/voice-form/sessions";
import { useVoiceFormSession } from "@/lib/voice-form/session-context";
import type { ConversationStub } from "@/lib/voice-form/types";
import { Loader2, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const SESSION_LIST_NEW_CLASS =
  "hover:bg-muted data-active:bg-muted h-8 justify-start gap-2 rounded-md px-2.5 text-sm font-normal";

const SESSION_LIST_ITEM_ROOT_CLASS =
  "group hover:bg-muted focus-visible:bg-muted data-active:bg-muted has-focus-visible:bg-muted relative flex h-8 items-center rounded-md transition-colors focus-within:outline-none";

const SESSION_LIST_ITEM_TRIGGER_CLASS =
  "focus-visible:ring-ring/50 flex h-full min-w-0 flex-1 items-center rounded-md px-2.5 text-start text-sm outline-none group-hover:pe-16 group-has-focus-visible:pe-16 group-data-active:pe-16 focus-visible:ring-[3px]";

const SESSION_LIST_ITEM_ACTION_CLASS =
  "absolute top-1/2 size-6 -translate-y-1/2 p-0 opacity-0 group-hover:opacity-100 group-has-focus-visible:opacity-100 group-data-active:opacity-100";

function VoiceFormSessionListItem({
  conversation,
  active,
  sessionBusy,
  onRename,
  onDelete,
}: {
  conversation: ConversationStub;
  active: boolean;
  sessionBusy: boolean;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = useCallback(() => {
    const current = conversation.title?.trim() || conversation.formName || "";
    setDraft(current);
    setEditing(true);
  }, [conversation.formName, conversation.title]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const commitRename = useCallback(async () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed) return;
    const current = conversation.title?.trim() || conversation.formName || "";
    if (trimmed === current) return;
    await onRename(conversation.id, trimmed);
  }, [conversation.formName, conversation.id, conversation.title, draft, onRename]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setDraft("");
  }, []);

  return (
    <li
      data-slot="aui_voice-form-session-list-item"
      {...(active ? { "data-active": "true" } : {})}
      className={SESSION_LIST_ITEM_ROOT_CLASS}
    >
      {editing ? (
        <Input
          ref={inputRef}
          value={draft}
          disabled={sessionBusy}
          data-slot="aui_voice-form-session-list-item-rename"
          className="h-7 min-w-0 flex-1 rounded-md px-2.5 text-sm"
          aria-label="Đổi tên phiên"
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
        />
      ) : (
        <Link
          href={voiceFormPath(conversation.id)}
          prefetch
          data-slot="aui_voice-form-session-list-item-trigger"
          className={SESSION_LIST_ITEM_TRIGGER_CLASS}
          aria-current={active ? "page" : undefined}
          onDoubleClick={(e) => {
            e.preventDefault();
            startEditing();
          }}
        >
          <span
            data-slot="aui_voice-form-session-list-item-title"
            className="min-w-0 flex-1 truncate"
            title={formatConvLabel(conversation)}
          >
            {formatConvLabel(conversation)}
          </span>
        </Link>
      )}

      {!editing && (
        <>
          <TooltipIconButton
            type="button"
            tooltip="Đổi tên"
            side="right"
            variant="ghost"
            size="icon"
            disabled={sessionBusy}
            data-slot="aui_voice-form-session-list-item-rename-trigger"
            className={cn(SESSION_LIST_ITEM_ACTION_CLASS, "end-8")}
            aria-label="Đổi tên phiên"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startEditing();
            }}
          >
            <PencilIcon className="size-3.5" />
          </TooltipIconButton>
          <TooltipIconButton
            type="button"
            tooltip="Xóa phiên"
            side="right"
            variant="ghost"
            size="icon"
            disabled={sessionBusy}
            data-slot="aui_voice-form-session-list-item-delete"
            className={cn(SESSION_LIST_ITEM_ACTION_CLASS, "end-1.5 hover:text-destructive")}
            aria-label="Xóa phiên"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(conversation.id);
            }}
          >
            <TrashIcon className="size-3.5" />
          </TooltipIconButton>
        </>
      )}
    </li>
  );
}

export function VoiceFormSessionSidebar() {
  const {
    initialAuth,
    urlSessionId,
    recordId,
    conversations,
    sessionBusy,
    createConversation,
    renameConversation,
    deleteConversation,
  } = useVoiceFormSession();

  const activeId = urlSessionId ?? recordId;

  if (!initialAuth) return null;

  return (
    <div className="aui-voice-form-session-list flex min-h-0 flex-1 flex-col gap-0.5 pt-1">
      <div className="shrink-0 px-1">
        <Button
          type="button"
          variant="ghost"
          data-slot="aui_voice-form-session-list-new"
          disabled={sessionBusy}
          className={cn("w-full", SESSION_LIST_NEW_CLASS)}
          onClick={() => void createConversation()}
        >
          {sessionBusy ? (
            <Loader2 className="size-4 shrink-0 animate-spin" />
          ) : (
            <PlusIcon data-slot="aui_voice-form-session-list-new-icon" className="size-4 shrink-0" />
          )}
          <span data-slot="aui_voice-form-session-list-new-label" className="whitespace-nowrap">
            Phiên điền mẫu mới
          </span>
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-1">
        {conversations.length === 0 ? (
          <p className="text-muted-foreground px-2.5 py-2 text-xs">Chưa có phiên nào.</p>
        ) : (
          <ul className="flex flex-col gap-0.5" data-slot="aui_voice-form-session-list-items">
            {conversations.map((c) => (
              <VoiceFormSessionListItem
                key={c.id}
                conversation={c}
                active={c.id === activeId}
                sessionBusy={sessionBusy}
                onRename={renameConversation}
                onDelete={(id) => void deleteConversation(id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}