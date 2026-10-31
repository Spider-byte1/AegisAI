"use client";

import { useEffect, useState } from "react";
import { LogOut, ShieldCheck, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useSound } from "@/hooks/useSound";

interface Props {
  /** true = API reachable, false = unreachable, null = not known yet */
  online: boolean | null;
  onLogout: () => void;
  onOpenCopilot: () => void;
}

function formatClock(now: Date | null): string {
  return now ? `${now.toISOString().slice(11, 19)} UTC` : "--:--:-- UTC";
}

export default function TopBar({ online, onLogout, onOpenCopilot }: Props) {
  const sound = useSound();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const status =
    online === null
      ? { label: "CONNECTING", dot: "bg-slate-500", text: "text-slate-400" }
      : online
        ? { label: "API ONLINE", dot: "bg-emerald-400 shadow-[0_0_8px_#39ff88]", text: "text-emerald-300" }
        : { label: "API UNREACHABLE", dot: "bg-red-500 shadow-[0_0_8px_#ff3b5c]", text: "text-red-300" };

  return (
    <header className="sticky top-0 z-40 border-b border-cyan-400/15 bg-[#04070d]/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/40 bg-cyan-400/10 text-cyan-300 shadow-[0_0_22px_rgba(34,211,238,0.35)]">
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-bold leading-none tracking-tight text-white">
              Aegis<span className="text-cyan-300">AI</span>
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-400">SOC Command Center</p>
          </div>
        </div>

        <div className="hidden items-center gap-5 md:flex">
          <span className={`flex items-center gap-2 font-mono text-[11px] tracking-widest ${status.text}`} role="status">
            <span className={`h-2 w-2 rounded-full ${status.dot}`} aria-hidden="true" />
            {status.label}
          </span>
          <span className="font-mono text-xs tabular-nums text-slate-300" aria-label="Current time in UTC">
            {formatClock(now)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={sound.toggle}
            aria-pressed={sound.enabled}
            aria-label="Sound alerts"
            title={sound.enabled ? "Sound alerts on" : "Sound alerts off"}
            className={`grid h-9 w-9 place-items-center rounded-lg border transition ${
              sound.enabled ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-300" : "border-white/10 text-slate-400 hover:text-white"
            }`}
          >
            {sound.enabled ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}
          </button>
          <button
            onClick={onOpenCopilot}
            className="flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-400/20"
          >
            <Sparkles size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Copilot</span>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-red-400/40 hover:text-red-300"
          >
            <LogOut size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
