"use client";

import { TooltipIconButton } from "@/components/tooltip-icon-button";
import { FormPickerDialog } from "@/components/form-module/composer-form-picker";
import { cn } from "@/lib/utils";
import { useT } from "@idx/i18n";
import { ComposerPrimitive } from "@assistant-ui/react";
import { FileText, Paperclip, PlusIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type FC } from "react";

const menuItemClass =
  "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none disabled:pointer-events-none disabled:opacity-50";

const MENU_GAP_PX = 6;
const MENU_ESTIMATED_HEIGHT_PX = 84;

type MenuPlacement = "top" | "bottom";

function resolveMenuPlacement(
  trigger: HTMLElement,
  menuHeight = MENU_ESTIMATED_HEIGHT_PX,
): MenuPlacement {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP_PX;
  const spaceAbove = rect.top - MENU_GAP_PX;

  if (spaceBelow >= menuHeight) return "bottom";
  if (spaceAbove >= menuHeight) return "top";
  return spaceAbove >= spaceBelow ? "top" : "bottom";
}

export const ComposerPlusMenu: FC<{
  formPickerDisabled?: boolean;
  variant?: "default" | "capture";
}> = ({ formPickerDisabled = false, variant = "default" }) => {
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const attachmentRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<MenuPlacement>("bottom");
  const [formPickerOpen, setFormPickerOpen] = useState(false);

  useLayoutEffect(() => {
    if (!menuOpen || !rootRef.current) return;

    const updatePlacement = () => {
      if (!rootRef.current) return;
      const menuHeight = menuRef.current?.offsetHeight ?? MENU_ESTIMATED_HEIGHT_PX;
      setMenuPlacement(resolveMenuPlacement(rootRef.current, menuHeight));
    };

    updatePlacement();

    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <div ref={rootRef} className="aui-composer-plus-menu relative">
      <TooltipIconButton
        tooltip={t("attachment.add")}
        side="bottom"
        variant="ghost"
        size="icon"
        type="button"
        className={cn(
          "aui-composer-add-attachment rounded-full p-1 text-xs font-semibold",
          variant === "capture"
            ? "text-foreground/75 hover:bg-muted/50 size-8"
            : "hover:bg-muted-foreground/15 dark:border-muted-foreground/15 dark:hover:bg-muted-foreground/30 size-7",
          menuOpen && "bg-muted",
        )}
        aria-label={t("attachment.add")}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <PlusIcon className="aui-attachment-add-icon size-4.5 stroke-[1.5px]" />
      </TooltipIconButton>

      {menuOpen && (
        <div
          ref={menuRef}
          role="menu"
          className={cn(
            "aui-composer-plus-menu-content bg-popover/95 text-popover-foreground animate-in fade-in-0 zoom-in-95 absolute start-0 z-50 min-w-[10.5rem] overflow-hidden rounded-xl border p-1.5 shadow-lg backdrop-blur-sm",
            menuPlacement === "bottom"
              ? "top-full mt-1.5 slide-in-from-top-2"
              : "bottom-full mb-1.5 slide-in-from-bottom-2",
          )}
        >
          <button
            type="button"
            role="menuitem"
            className={menuItemClass}
            onClick={() => {
              attachmentRef.current?.click();
              setMenuOpen(false);
            }}
          >
            <Paperclip className="size-4 shrink-0" />
            Chọn tệp
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItemClass}
            disabled={formPickerDisabled}
            onClick={() => {
              setFormPickerOpen(true);
              setMenuOpen(false);
            }}
          >
            <FileText className="size-4 shrink-0" />
            Chọn biểu mẫu
          </button>
        </div>
      )}

      <ComposerPrimitive.AddAttachment
        ref={attachmentRef}
        className="pointer-events-none absolute size-0 overflow-hidden opacity-0"
        aria-hidden
        tabIndex={-1}
      />

      <FormPickerDialog
        open={formPickerOpen}
        onOpenChange={setFormPickerOpen}
        disabled={formPickerDisabled}
      />
    </div>
  );
};