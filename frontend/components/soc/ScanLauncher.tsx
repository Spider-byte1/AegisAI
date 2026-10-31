"use client";

import { useState, type FormEvent } from "react";
import { Crosshair } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import ProgressBar from "@/components/ui/ProgressBar";
import type { ScanStatus } from "@/lib/types";

interface Props {
  onLaunch: (target: string, authorized: boolean) => Promise<boolean>;
  busy: boolean;
  error: string | null;
  /** The scan being followed, if any: drives the live progress bar. */
  status?: ScanStatus | null;
}

export default function ScanLauncher({ onLaunch, busy, error, status }: Props) {
  const [target, setTarget] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const ready = target.trim().length > 0 && authorized && !busy;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    await onLaunch(target.trim(), authorized);
  };

  return (
    <GlassCard title="Launch assessment" subtitle="Enter a domain or IP you are authorised to test" icon={<Crosshair size={16} aria-hidden="true" />} accent="green">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-emerald-400/30 bg-black/40 px-4 focus-within:border-emerald-300 focus-within:shadow-[0_0_18px_rgba(57,255,136,0.25)]">
            <span className="font-mono text-emerald-300" aria-hidden="true">$</span>
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="example.com or 93.184.216.34"
              aria-label="Scan target"
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-transparent py-3 font-mono text-sm text-emerald-100 outline-none placeholder:text-slate-600"
            />
          </label>
          <button
            type="submit"
            disabled={!ready}
            className="rounded-xl border border-emerald-300/50 bg-emerald-400/15 px-6 py-3 font-mono text-sm font-semibold tracking-widest text-emerald-200 transition enabled:hover:bg-emerald-400/25 enabled:hover:shadow-[0_0_22px_rgba(57,255,136,0.35)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "SCANNING..." : "LAUNCH SCAN"}
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-400">
          <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} className="h-4 w-4 accent-emerald-400" />
          I own this target or have written permission to scan it
        </label>
        {status && (status.status === "queued" || status.status === "running") && (
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-xs text-slate-400">
              <span>{status.target}: {status.message}</span>
              <span>{status.progress}%</span>
            </div>
            <ProgressBar label="Scan progress" value={status.progress} tone="green" />
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
      </form>
    </GlassCard>
  );
}
