"use client";

import { useFormModuleActions } from "@/lib/form-module/form-module-store";
import { useAuiState } from "@assistant-ui/react";
import { useEffect } from "react";

/** Clears form-lock when the active thread changes. */
export function FormThreadSync() {
  const remoteId = useAuiState((s) => s.threadListItem?.remoteId);
  const { clearOnThreadSwitch } = useFormModuleActions();

  useEffect(() => {
    clearOnThreadSwitch(remoteId ?? null);
  }, [remoteId, clearOnThreadSwitch]);

  return null;
}