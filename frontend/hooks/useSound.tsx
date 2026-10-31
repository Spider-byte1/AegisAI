"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { playSound, soundStore, type SoundKind } from "@/lib/sound";

interface SoundContextValue {
  enabled: boolean;
  toggle: () => void;
  /** Plays the sound only when the user has switched sound on. */
  play: (kind: SoundKind) => void;
}

const SoundContext = createContext<SoundContextValue>({ enabled: false, toggle: () => {}, play: () => {} });

export function SoundProvider({ children }: { children: ReactNode }) {
  const enabled = useSyncExternalStore(soundStore.subscribe, soundStore.getSnapshot, soundStore.getServerSnapshot);

  const toggle = useCallback(() => {
    const next = !soundStore.getSnapshot();
    soundStore.set(next);
    if (next) playSound("enable"); // this click is also the user gesture browsers require
  }, []);

  const play = useCallback((kind: SoundKind) => {
    if (soundStore.getSnapshot()) playSound(kind);
  }, []);

  const value = useMemo(() => ({ enabled, toggle, play }), [enabled, toggle, play]);
  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export const useSound = (): SoundContextValue => useContext(SoundContext);
