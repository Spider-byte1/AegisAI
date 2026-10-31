"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export interface CopilotRequest {
  id: number;
  question: string;
}

interface CopilotContextValue {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  /** A question another panel wants the Copilot to answer (e.g. "Explain this vulnerability"). */
  pending: CopilotRequest | null;
  openWith: (question: string) => void;
  consumePending: (id: number) => void;
}

const CopilotContext = createContext<CopilotContextValue>({
  isOpen: false, setOpen: () => {}, pending: null, openWith: () => {}, consumePending: () => {},
});

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [pending, setPending] = useState<CopilotRequest | null>(null);
  const nextId = useRef(1);

  const openWith = useCallback((question: string) => {
    setPending({ id: nextId.current++, question });
    setOpen(true);
  }, []);

  const consumePending = useCallback((id: number) => {
    setPending((current) => (current?.id === id ? null : current));
  }, []);

  const value = useMemo(() => ({ isOpen, setOpen, pending, openWith, consumePending }), [isOpen, pending, openWith, consumePending]);
  return <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>;
}

export const useCopilot = (): CopilotContextValue => useContext(CopilotContext);
