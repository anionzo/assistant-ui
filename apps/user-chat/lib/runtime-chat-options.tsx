"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type RuntimeChatOptions = {
  pipeline?: string;
  topK?: number;
};

type RuntimeChatOptionsContextValue = {
  options: RuntimeChatOptions;
  setPipeline: (pipeline: string) => void;
  setTopK: (topK: number) => void;
  getOptions: () => RuntimeChatOptions;
};

const RuntimeChatOptionsContext =
  createContext<RuntimeChatOptionsContextValue | null>(null);

export function RuntimeChatOptionsProvider({ children }: { children: ReactNode }) {
  const [pipeline, setPipelineState] = useState<string | undefined>();
  const [topK, setTopKState] = useState<number | undefined>();
  const optionsRef = useRef<RuntimeChatOptions>({});

  const syncRef = useCallback((next: RuntimeChatOptions) => {
    optionsRef.current = next;
  }, []);

  const options = useMemo<RuntimeChatOptions>(() => {
    const next: RuntimeChatOptions = {};
    if (pipeline) next.pipeline = pipeline;
    if (topK != null) next.topK = topK;
    syncRef(next);
    return next;
  }, [pipeline, topK, syncRef]);

  const setPipeline = useCallback((value: string) => {
    setPipelineState(value);
  }, []);

  const setTopK = useCallback((value: number) => {
    setTopKState(value);
  }, []);

  const getOptions = useCallback(() => optionsRef.current, []);

  const value = useMemo(
    () => ({
      options,
      setPipeline,
      setTopK,
      getOptions,
    }),
    [getOptions, options, setPipeline, setTopK],
  );

  return (
    <RuntimeChatOptionsContext.Provider value={value}>
      {children}
    </RuntimeChatOptionsContext.Provider>
  );
}

export function useRuntimeChatOptions() {
  const context = useContext(RuntimeChatOptionsContext);
  if (!context) {
    throw new Error("useRuntimeChatOptions must be used within RuntimeChatOptionsProvider");
  }
  return context;
}

export function useRuntimeChatOptionsRef() {
  return useRuntimeChatOptions().getOptions;
}