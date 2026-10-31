"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { useSound } from "@/hooks/useSound";
import { useTypewriter } from "@/hooks/useTypewriter";
import type { TerminalLine, TerminalTone } from "@/lib/terminal";

const TONES: Record<TerminalTone, string> = {
  cmd: "text-cyan-300",
  info: "text-slate-300",
  ok: "text-emerald-300",
  warn: "text-amber-300",
  error: "text-red-400",
};

interface Props {
  lines: TerminalLine[];
  /** Changes when a new scan starts, so the typing animation starts over. */
  sessionKey: string;
  speedMs?: number;
}

/** Hacker-style console: output is typed out character by character, with an optional soft key-tick sound. */
export default function ScanTerminal({ lines, sessionKey, speedMs = 14 }: Props) {
  const sound = useSound();
  const ticks = useRef(0);
  const view = useTypewriter(lines, sessionKey, speedMs, () => {
    ticks.current += 1;
    if (ticks.current % 3 === 0) sound.play("type");
  });
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (body.current) body.current.scrollTop = body.current.scrollHeight;
  });

  const idle = view.done.length === 0 && !view.typing;

  return (
    <GlassCard title="SOC terminal" subtitle="Live agent log" icon={<Terminal size={16} aria-hidden="true" />} accent="green">
      <div className="scanlines flex min-h-72 flex-1 flex-col overflow-hidden rounded-xl border border-emerald-400/20 bg-black/60">
        <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-2" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-3 font-mono text-[11px] text-slate-500">aegis@soc:~</span>
        </div>
        <div ref={body} role="log" aria-live="polite" aria-label="Scan log" className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-[13px] leading-relaxed">
          {idle && (
            <p className="text-slate-500">
              $ awaiting scan target<span className="animate-soc-blink">_</span>
            </p>
          )}
          {view.done.map((l) => (
            <p key={l.id} className={`${TONES[l.tone]} break-words`}>{l.text}</p>
          ))}
          {view.typing && (
            <p className={`${TONES[view.typing.line.tone]} break-words`}>
              {view.typing.text}
              <span className="animate-soc-blink ml-0.5 inline-block h-3.5 w-2 translate-y-0.5 bg-emerald-300" aria-hidden="true" />
            </p>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
