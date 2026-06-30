"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

type ActiveConversationContextValue = {
  getConversationId: () => string;
};

const ActiveConversationContext = createContext<ActiveConversationContextValue | null>(
  null,
);

export function ActiveConversationProvider({
  getConversationId,
  children,
}: {
  getConversationId: () => string;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ getConversationId }), [getConversationId]);
  return (
    <ActiveConversationContext.Provider value={value}>
      {children}
    </ActiveConversationContext.Provider>
  );
}

export function useActiveConversationId() {
  const context = useContext(ActiveConversationContext);
  if (!context) {
    throw new Error("useActiveConversationId must be used within ActiveConversationProvider");
  }
  return context.getConversationId;
}