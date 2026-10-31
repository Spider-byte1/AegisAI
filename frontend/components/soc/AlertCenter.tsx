"use client";

import { useEffect, useState } from "react";
import { Bell, MessageSquareText, Siren, X } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import SeverityBadge from "@/components/ui/SeverityBadge";
import { useSound } from "@/hooks/useSound";
import { SEVERITY_STYLES, severityRank } from "@/lib/severity";
import type { Alert } from "@/lib/types";

// ---------------------------------------------------------------- feed
interface FeedProps {
  alerts: Alert[];
  onExplain: (alert: Alert) => void;
}

export function AlertFeed({ alerts, onExplain }: FeedProps) {
  const [acknowledged, setAcknowledged] = useState<ReadonlySet<string>>(new Set());
  const open = alerts.filter((a) => !acknowledged.has(a.id));

  return (
    <GlassCard
      title="Threat alerts"
      subtitle={open.length === 0 ? "Nothing needs attention" : `${open.length} active`}
      icon={<Siren size={16} aria-hidden="true" />}
      accent="red"
      actions={open.length > 0 && <span className="rounded-full border border-red-500/40 bg-red-500/10 px-2 font-mono text-xs text-red-300">{open.length}</span>}
    >
      {open.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          {alerts.length === 0 ? "No alerts. Alerts appear when a scan finds medium or higher severity issues." : "All alerts acknowledged."}
        </p>
      ) : (
        <ul className="space-y-3">
          {open.map((a) => {
            const s = SEVERITY_STYLES[a.severity];
            return (
              <li key={a.id} className={`rounded-xl border-l-4 border border-white/5 bg-black/25 p-3 ${s.border} ${a.severity === "critical" ? "animate-soc-alarm" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-100">{a.title}</p>
                  <SeverityBadge severity={a.severity} />
                </div>
                <p className="mt-1 text-xs text-slate-400">{a.detail}</p>
                <p className="mt-2 font-mono text-xs text-slate-300">Risk score <span className={s.text}>{a.risk_score}/100</span></p>
                <p className="mt-1 text-xs text-slate-300"><span className="text-slate-500">Recommended action:</span> {a.action}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => onExplain(a)} className="flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-300 hover:bg-emerald-400/20">
                    <MessageSquareText size={12} aria-hidden="true" /> Explain
                  </button>
                  <button onClick={() => setAcknowledged((prev) => new Set(prev).add(a.id))} className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-slate-300 hover:text-white">
                    Acknowledge
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </GlassCard>
  );
}

// ---------------------------------------------------------------- toasts
export interface ToastBatch {
  key: number;
  alerts: Alert[];
}

interface ToastProps {
  batch: ToastBatch | null;
  onExplain: (alert: Alert) => void;
  /** milliseconds before a toast hides itself; critical alerts stay until dismissed */
  autoHideMs?: number;
}

const MAX_TOASTS = 3;

/** Pop-up alerts for a scan that just finished: severity colours, animation and (optional) sound. */
export function AlertToasts({ batch, onExplain, autoHideMs = 12000 }: ToastProps) {
  const sound = useSound();
  const [dismissed, setDismissed] = useState<{ key: number; ids: ReadonlySet<string> }>({ key: -1, ids: new Set() });

  const urgent = (batch?.alerts ?? [])
    .filter((a) => a.severity === "critical" || a.severity === "high")
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, MAX_TOASTS);
  const hidden = dismissed.key === batch?.key ? dismissed.ids : new Set<string>();
  const visible = urgent.filter((a) => !hidden.has(a.id));

  const dismiss = (id: string) => {
    if (!batch) return;
    setDismissed((prev) => ({ key: batch.key, ids: new Set(prev.key === batch.key ? prev.ids : []).add(id) }));
  };

  // One sound per batch: the alarm for critical, a two-tone chirp for high.
  const topSeverity = urgent[0]?.severity;
  useEffect(() => {
    if (!batch || !topSeverity) return;
    sound.play(topSeverity === "critical" ? "critical" : "alert");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch?.key, topSeverity]);

  // High alerts fade out by themselves; critical ones wait for a human.
  useEffect(() => {
    if (!batch) return;
    const timers = urgent
      .filter((a) => a.severity !== "critical")
      .map((a) => setTimeout(() => setDismissed((prev) => ({ key: batch.key, ids: new Set(prev.key === batch.key ? prev.ids : []).add(a.id) })), autoHideMs));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch?.key, autoHideMs]);

  if (visible.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
      {visible.map((a) => {
        const s = SEVERITY_STYLES[a.severity];
        return (
          <div key={a.id} role="alert" className={`animate-soc-toast pointer-events-auto rounded-xl border bg-[#070d18]/95 p-4 backdrop-blur ${s.border} ${s.glow}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 ${s.text}`}><Bell size={18} aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <p className={`font-mono text-[11px] font-bold tracking-[0.2em] ${s.text}`}>{a.severity === "critical" ? "CRITICAL ALERT" : "HIGH RISK ALERT"}</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">{a.title}</p>
                <p className="mt-1 font-mono text-xs text-slate-400">Risk score {a.risk_score}/100</p>
                <p className="mt-1 text-xs text-slate-300">Recommended action: {a.action}</p>
                <button onClick={() => onExplain(a)} className="mt-2 text-xs text-emerald-300 hover:underline">Explain with Copilot</button>
              </div>
              <button onClick={() => dismiss(a.id)} aria-label="Dismiss alert" className="text-slate-500 hover:text-white">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
