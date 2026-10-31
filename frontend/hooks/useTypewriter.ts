"use client";

import { useEffect, useRef, useState } from "react";
import type { TerminalLine } from "@/lib/terminal";

export interface TypedView {
  /** Lines that are fully typed. */
  done: TerminalLine[];
  /** The line being typed right now, with the part revealed so far. */
  typing: { line: TerminalLine; text: string } | null;
}

interface Cursor {
  key: string;
  line: number;
  chars: number;
}

/**
 * Types `lines` out one character at a time. Lines can be appended while it runs.
 * Changing `resetKey` (e.g. a new scan) starts over. `onTick` fires for each typed character.
 *
 * The typing position lives in a ref that is advanced synchronously on every tick (and mirrored
 * into state only to trigger a re-render), so two ticks that land in the same React batch can
 * never read a stale position.
 */
export function useTypewriter(lines: TerminalLine[], resetKey: string, speedMs = 14, onTick?: (char: string) => void): TypedView {
  const [shown, setShown] = useState<Cursor>({ key: resetKey, line: 0, chars: 0 });
  const cursor: Cursor = shown.key === resetKey ? shown : { key: resetKey, line: 0, chars: 0 };

  const position = useRef<Cursor>({ key: resetKey, line: 0, chars: 0 });
  const latest = useRef({ lines, onTick });
  useEffect(() => {
    latest.current = { lines, onTick };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      let at = position.current;
      if (at.key !== resetKey) at = { key: resetKey, line: 0, chars: 0 };
      const { lines: all, onTick: tick } = latest.current;
      if (at.line >= all.length) {
        position.current = at; // everything typed: idle until new lines arrive
        return;
      }
      const text = all[at.line].text;
      let next: Cursor;
      if (at.chars < text.length) {
        tick?.(text[at.chars]);
        next = { key: resetKey, line: at.line, chars: at.chars + 1 };
      } else {
        next = { key: resetKey, line: at.line + 1, chars: 0 };
      }
      position.current = next;
      setShown(next);
    }, speedMs);
    return () => clearInterval(timer);
  }, [resetKey, speedMs]);

  const lineIndex = Math.min(cursor.line, lines.length);
  return {
    done: lines.slice(0, lineIndex),
    typing: lineIndex < lines.length ? { line: lines[lineIndex], text: lines[lineIndex].text.slice(0, cursor.chars) } : null,
  };
}
