"use client";

import {
  AssistantRuntimeProvider,
  useLocalRuntime,
} from "@assistant-ui/react";
import { useRef, type ReactNode } from "react";
import { createModularRagAdapter } from "./modular-rag-adapter";

export function RuntimeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const conversationId = useRef<string>(undefined);
  if (!conversationId.current) conversationId.current = crypto.randomUUID();
  const adapter = useRef(createModularRagAdapter(conversationId.current));
  const runtime = useLocalRuntime(adapter.current);

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
