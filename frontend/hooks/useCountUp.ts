"use client";

import { useEffect, useRef, useState } from "react";

/** Animates a number from its current value to `target` (ease-out). */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const shown = useRef(0);

  useEffect(() => {
    const from = shown.current;
    let raf = 0;
    let start: number | null = null;
    const step = (now: number) => {
      start ??= now;
      const t = durationMs <= 0 ? 1 : Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (target - from) * eased);
      shown.current = next;
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}
