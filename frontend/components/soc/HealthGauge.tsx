"use client";

import { HeartPulse, TrendingDown, TrendingUp } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { useCountUp } from "@/hooks/useCountUp";
import type { Analysis } from "@/lib/types";

const RADIUS = 56;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function tone(score: number): { stroke: string; text: string } {
  if (score >= 80) return { stroke: "#39ff88", text: "text-emerald-300" };
  if (score >= 60) return { stroke: "#ffc53d", text: "text-amber-300" };
  return { stroke: "#ff3b5c", text: "text-red-400" };
}

export default function HealthGauge({ health }: { health: Analysis["health"] | null }) {
  const score = health?.score ?? 0;
  const shown = useCountUp(score);
  const color = tone(score);
  const filled = Math.round(score / 10);

  return (
    <GlassCard title="Security health" subtitle="Inverse of the scan's risk score" icon={<HeartPulse size={16} aria-hidden="true" />} accent="green">
      {!health ? (
        <p className="py-6 text-center text-sm text-slate-400">Run a scan to measure the security health of a target.</p>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-40 w-40">
            <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" role="img" aria-label={`Security health ${score} percent, grade ${health.grade}`}>
              <circle cx="70" cy="70" r={RADIUS} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="10" />
              <circle
                cx="70" cy="70" r={RADIUS} fill="none" stroke={color.stroke} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - shown / 100)}
                style={{ filter: `drop-shadow(0 0 8px ${color.stroke})` }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <p className={`font-mono text-4xl font-bold tabular-nums ${color.text}`}>{shown}%</p>
                <p className="mt-0.5 font-mono text-xs tracking-[0.2em] text-slate-400">GRADE <span className={`text-base font-bold ${color.text}`}>{health.grade}</span></p>
              </div>
            </div>
          </div>

          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className="h-2 w-5 rounded-sm" style={{ background: i < filled ? color.stroke : "rgba(148,163,184,0.18)", boxShadow: i < filled ? `0 0 8px ${color.stroke}` : "none" }} />
            ))}
          </div>

          <div className="w-full rounded-xl border border-white/5 bg-black/25 p-3 text-sm">
            {health.previous_score === null || health.delta === null ? (
              <p className="text-center text-slate-400">First scan of this target. Scan it again to see the trend.</p>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Previous scan</p>
                  <p className="font-mono text-slate-200">{health.previous_score}%</p>
                </div>
                <div className={`flex items-center gap-1.5 font-mono font-semibold ${health.delta > 0 ? "text-emerald-300" : health.delta < 0 ? "text-red-400" : "text-slate-300"}`}>
                  {health.delta > 0 ? <TrendingUp size={18} aria-hidden="true" /> : health.delta < 0 ? <TrendingDown size={18} aria-hidden="true" /> : null}
                  <span aria-label="Change since previous scan">{health.delta > 0 ? "+" : ""}{health.delta}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
