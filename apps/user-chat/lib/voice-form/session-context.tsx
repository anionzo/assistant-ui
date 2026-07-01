"use client";

import {
  createSession,
  deleteSession,
  listSessions,
  loadSession,
  renameSession,
  saveSessionState,
  toConversationStub,
  type VoiceFormSessionRecord,
} from "@/lib/voice-form/sessions";
import type { ChatTurn, ConversationStub } from "@/lib/voice-form/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type VoiceFormSaveStatus = "idle" | "saving" | "saved" | "error";

type PersistOverrides = {
  formCode?: string;
  formName?: string;
  fieldValues?: Record<string, unknown>;
  history?: ChatTurn[];
  decision?: string;
};

type VoiceFormSessionContextValue = {
  initialAuth: boolean;
  urlSessionId?: string;
  recordId: string;
  gatewaySessionId: string;
  conversations: ConversationStub[];
  saveStatus: VoiceFormSaveStatus;
  sessionBusy: boolean;
  restoredRecord: VoiceFormSessionRecord | null;
  consumeRestoredRecord: () => void;
  bootstrapSessions: () => Promise<void>;
  createConversation: () => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  persistSession: (
    snapshot: PersistOverrides & {
      formCode: string;
      formName: string;
      fieldValues: Record<string, unknown>;
      history: ChatTurn[];
      decision: string;
    },
    overrides?: PersistOverrides,
  ) => Promise<void>;
  setGuestGatewayId: (id: string) => void;
};

const VoiceFormSessionContext = createContext<VoiceFormSessionContextValue | null>(null);

const SAVE_DEBOUNCE_MS = 500;

function sortConversations(stubs: ConversationStub[]) {
  return [...stubs].sort((a, b) => b.updatedAt - a.updatedAt);
}

function stubFromRecord(record: VoiceFormSessionRecord): ConversationStub {
  return toConversationStub({
    id: record.id,
    title: record.title,
    formCode: record.formCode,
    formName: record.formName,
    fieldCount: record.fieldCount,
    decision: record.decision,
    updatedAt: new Date(record.updatedAt).toISOString(),
  });
}

export function VoiceFormSessionProvider({
  initialAuth,
  urlSessionId,
  onSessionIdChange,
  children,
}: {
  initialAuth: boolean;
  urlSessionId?: string;
  onSessionIdChange?: (sessionId: string) => void;
  children: ReactNode;
}) {
  const [recordId, setRecordId] = useState("");
  const [guestGatewayId, setGuestGatewayIdState] = useState("");
  const [conversations, setConversations] = useState<ConversationStub[]>([]);
  const [saveStatus, setSaveStatus] = useState<VoiceFormSaveStatus>("idle");
  const [sessionBusy, setSessionBusy] = useState(false);
  const [restoredRecord, setRestoredRecord] = useState<VoiceFormSessionRecord | null>(null);

  const sessionCacheRef = useRef(new Map<string, VoiceFormSessionRecord>());
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistQueueRef = useRef<Parameters<VoiceFormSessionContextValue["persistSession"]>[0] | null>(null);
  const bootstrapStartedRef = useRef(false);
  const onSessionIdChangeRef = useRef(onSessionIdChange);
  onSessionIdChangeRef.current = onSessionIdChange;

  const gatewaySessionId = initialAuth ? recordId : guestGatewayId;

  const notifySessionId = useCallback((id: string) => {
    onSessionIdChangeRef.current?.(id);
  }, []);

  const cacheRecord = useCallback((record: VoiceFormSessionRecord) => {
    sessionCacheRef.current.set(record.id, record);
  }, []);

  const upsertConversationStub = useCallback((stub: ConversationStub) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== stub.id);
      next.unshift(stub);
      return sortConversations(next);
    });
  }, []);

  const signalRestore = useCallback((record: VoiceFormSessionRecord) => {
    cacheRecord(record);
    setRecordId(record.id);
    setRestoredRecord(record);
    upsertConversationStub(stubFromRecord(record));
  }, [cacheRecord, upsertConversationStub]);

  const activateSession = useCallback(
    async (id: string) => {
      const cached = sessionCacheRef.current.get(id);
      if (cached) {
        signalRestore(cached);
        return cached;
      }
      const record = await loadSession(id);
      signalRestore(record);
      return record;
    },
    [signalRestore],
  );

  const flushPersist = useCallback(async () => {
    if (!recordId || !initialAuth || !persistQueueRef.current) return;
    const payload = persistQueueRef.current;
    persistQueueRef.current = null;
    setSaveStatus("saving");
    try {
      const updated = await saveSessionState({
        id: recordId,
        formCode: payload.formCode,
        formName: payload.formName,
        fieldValues: payload.fieldValues,
        history: payload.history.map((t) => ({ role: t.role, text: t.text })),
        decision: payload.decision,
      });
      cacheRecord(updated);
      upsertConversationStub(stubFromRecord(updated));
      setSaveStatus("saved");
    } catch (err) {
      console.error("persist voice-form session failed", err);
      setSaveStatus("error");
    }
  }, [recordId, initialAuth, cacheRecord, upsertConversationStub]);

  const persistSession = useCallback(
    async (
      snapshot: PersistOverrides & {
        formCode: string;
        formName: string;
        fieldValues: Record<string, unknown>;
        history: ChatTurn[];
        decision: string;
      },
      overrides?: PersistOverrides,
    ) => {
      if (!recordId || !initialAuth) return;
      const nextHistory = (overrides?.history ?? snapshot.history).map((t) => ({
        role: t.role,
        text: t.text,
      }));
      persistQueueRef.current = {
        formCode: overrides?.formCode ?? snapshot.formCode,
        formName: overrides?.formName ?? snapshot.formName,
        fieldValues: overrides?.fieldValues ?? snapshot.fieldValues,
        history: nextHistory,
        decision: overrides?.decision ?? snapshot.decision,
      };
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        void flushPersist();
      }, SAVE_DEBOUNCE_MS);
    },
    [recordId, initialAuth, flushPersist],
  );

  const bootstrapSessions = useCallback(async () => {
    if (!initialAuth || bootstrapStartedRef.current) return;
    bootstrapStartedRef.current = true;
    setSessionBusy(true);
    try {
      const stubs = await listSessions();
      setConversations(sortConversations(stubs));

      if (urlSessionId) {
        try {
          await activateSession(urlSessionId);
          return;
        } catch {
          /* invalid id in URL — fall through */
        }
      }

      if (stubs.length) {
        const id = stubs[0].id;
        await activateSession(id);
        if (!urlSessionId) notifySessionId(id);
        return;
      }

      const record = await createSession();
      signalRestore(record);
      notifySessionId(record.id);
    } finally {
      setSessionBusy(false);
    }
  }, [initialAuth, urlSessionId, activateSession, signalRestore, notifySessionId]);

  const createConversation = useCallback(async () => {
    if (!initialAuth) return;
    setSessionBusy(true);
    try {
      const record = await createSession();
      signalRestore(record);
      notifySessionId(record.id);
    } finally {
      setSessionBusy(false);
    }
  }, [initialAuth, signalRestore, notifySessionId]);

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      if (!initialAuth || !id) return;
      const trimmed = title.trim();
      if (!trimmed) return;
      setSessionBusy(true);
      try {
        const updated = await renameSession(id, trimmed);
        cacheRecord(updated);
        upsertConversationStub(stubFromRecord(updated));
      } finally {
        setSessionBusy(false);
      }
    },
    [initialAuth, cacheRecord, upsertConversationStub],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      if (!initialAuth || !id) return;
      setSessionBusy(true);
      try {
        await deleteSession(id);
        sessionCacheRef.current.delete(id);
        let nextList: ConversationStub[] = [];
        setConversations((prev) => {
          nextList = prev.filter((c) => c.id !== id);
          return nextList;
        });
        if (id !== recordId) return;
        if (nextList.length) {
          const nextId = nextList[0].id;
          await activateSession(nextId);
          notifySessionId(nextId);
        } else {
          await createConversation();
        }
      } finally {
        setSessionBusy(false);
      }
    },
    [initialAuth, recordId, activateSession, createConversation, notifySessionId],
  );

  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  useEffect(() => {
    if (!initialAuth || !bootstrapStartedRef.current) return;
    if (!urlSessionId || urlSessionId === recordId) return;

    let cancelled = false;
    setSessionBusy(true);
    void activateSession(urlSessionId)
      .catch(() => {
        if (cancelled) return;
        const fallback = conversationsRef.current[0]?.id;
        if (fallback) notifySessionId(fallback);
      })
      .finally(() => {
        if (!cancelled) setSessionBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [urlSessionId, initialAuth, recordId, activateSession, notifySessionId]);

  const consumeRestoredRecord = useCallback(() => {
    setRestoredRecord(null);
  }, []);

  const setGuestGatewayId = useCallback((id: string) => {
    setGuestGatewayIdState(id);
  }, []);

  const value = useMemo(
    () => ({
      initialAuth,
      urlSessionId,
      recordId,
      gatewaySessionId,
      conversations,
      saveStatus,
      sessionBusy,
      restoredRecord,
      consumeRestoredRecord,
      bootstrapSessions,
      createConversation,
      renameConversation,
      deleteConversation,
      persistSession,
      setGuestGatewayId,
    }),
    [
      initialAuth,
      urlSessionId,
      recordId,
      gatewaySessionId,
      conversations,
      saveStatus,
      sessionBusy,
      restoredRecord,
      consumeRestoredRecord,
      bootstrapSessions,
      createConversation,
      renameConversation,
      deleteConversation,
      persistSession,
      setGuestGatewayId,
    ],
  );

  return (
    <VoiceFormSessionContext.Provider value={value}>{children}</VoiceFormSessionContext.Provider>
  );
}

export function useVoiceFormSession() {
  const ctx = useContext(VoiceFormSessionContext);
  if (!ctx) {
    throw new Error("useVoiceFormSession must be used within VoiceFormSessionProvider");
  }
  return ctx;
}