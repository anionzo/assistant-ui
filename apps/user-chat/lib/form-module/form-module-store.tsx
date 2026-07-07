"use client";

import type { FormSchema } from "@/lib/voice-form/types";
import type { FormCardStatus } from "@/lib/form-module/form-card-metadata";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type ComposerMode = "rag" | "form-fill";

export type FormBinding = {
  threadId: string;
  formSessionId: string;
  cardMessageId: string;
  formCode: string;
  formName: string;
};

export type FormModuleSnapshot = {
  mode: ComposerMode;
  threadId: string | null;
  binding: FormBinding | null;
  fieldValues: Record<string, unknown>;
  schema: FormSchema | null;
  nextField: string | null;
  invalidFields: Record<string, string>;
  decision: string;
  busy: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
};

const INITIAL: FormModuleSnapshot = {
  mode: "rag",
  threadId: null,
  binding: null,
  fieldValues: {},
  schema: null,
  nextField: null,
  invalidFields: {},
  decision: "incomplete",
  busy: false,
  saveStatus: "idle",
};

type Listener = () => void;

function createFormModuleStore() {
  let state = INITIAL;
  const listeners = new Set<Listener>();

  const notify = () => listeners.forEach((l) => l());

  return {
    getSnapshot: () => state,
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    apply: (patch: Partial<FormModuleSnapshot>) => {
      state = { ...state, ...patch };
      notify();
    },
    activate: (input: {
      binding: FormBinding;
      fieldValues?: Record<string, unknown>;
      schema?: FormSchema | null;
      decision?: string;
      nextField?: string | null;
      invalidFields?: Record<string, string>;
    }) => {
      state = {
        ...state,
        mode: "form-fill",
        threadId: input.binding.threadId,
        binding: input.binding,
        fieldValues: input.fieldValues ?? {},
        schema: input.schema ?? null,
        decision: input.decision ?? "incomplete",
        nextField: input.nextField ?? null,
        invalidFields: input.invalidFields ?? {},
        busy: false,
      };
      notify();
    },
    deactivate: () => {
      state = {
        ...INITIAL,
        saveStatus: state.saveStatus,
      };
      notify();
    },
    clearOnThreadSwitch: (currentThreadId: string | null) => {
      if (state.mode === "form-fill" && state.binding?.threadId !== currentThreadId) {
        state = { ...INITIAL };
        notify();
      } else {
        state = { ...state, threadId: currentThreadId };
        notify();
      }
    },
    setBusy: (busy: boolean) => {
      state = { ...state, busy };
      notify();
    },
    setSaveStatus: (saveStatus: FormModuleSnapshot["saveStatus"]) => {
      state = { ...state, saveStatus };
      notify();
    },
    updateCardStatus: (_status: FormCardStatus) => {
      /* card metadata updated via thread actions */
    },
  };
}

export type FormModuleStore = ReturnType<typeof createFormModuleStore>;

const FormModuleStoreContext = createContext<FormModuleStore | null>(null);
const FormModuleStoreRefContext = createContext<React.MutableRefObject<FormModuleStore> | null>(
  null,
);

export function FormModuleProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<FormModuleStore | null>(null);
  if (!storeRef.current) storeRef.current = createFormModuleStore();
  const store = storeRef.current;

  const ref = useRef(store);
  ref.current = store;

  return (
    <FormModuleStoreRefContext.Provider value={ref}>
      <FormModuleStoreContext.Provider value={store}>{children}</FormModuleStoreContext.Provider>
    </FormModuleStoreRefContext.Provider>
  );
}

export function useFormModuleStoreRef() {
  const ref = useContext(FormModuleStoreRefContext);
  if (!ref) throw new Error("useFormModuleStoreRef requires FormModuleProvider");
  return ref;
}

export function useFormModuleStore<T>(selector: (s: FormModuleSnapshot) => T): T {
  const store = useContext(FormModuleStoreContext);
  if (!store) throw new Error("useFormModuleStore requires FormModuleProvider");
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getSnapshot()),
    () => selector(store.getSnapshot()),
  );
}

export function useFormModuleStoreApi() {
  const store = useContext(FormModuleStoreContext);
  if (!store) throw new Error("useFormModuleStoreApi requires FormModuleProvider");
  return store;
}

export function useFormModuleActions() {
  const store = useFormModuleStoreApi();
  return useMemo(
    () => ({
      activate: store.activate,
      deactivate: store.deactivate,
      apply: store.apply,
      setBusy: store.setBusy,
      setSaveStatus: store.setSaveStatus,
      clearOnThreadSwitch: store.clearOnThreadSwitch,
    }),
    [store],
  );
}