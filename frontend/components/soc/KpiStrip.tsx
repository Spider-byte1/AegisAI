"use client";

import type { ReactNode } from "react";
import { Activity, AlertOctagon, ShieldAlert, ShieldCheck } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import type { DashboardStats } from "@/lib/types";

interface TileProps {
  label: string;
  value: number;
  icon: ReactNode;
  tone: string;
  glow: string;
}

function Tile({ label, value, icon, tone, glow }: TileProps) {
  const shown = useCountUp(value);
  return (
    <div className={`glass animate-soc-rise relative overflow-hidden rounded-2xl border border-white/10 p-4 ${glow}`}>
      <div className="flex items-start justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
        <span className={tone}>{icon}</span>
      </div>
      <p className={`mt-3 font-mono text-4xl font-bold tabular-nums ${tone}`} aria-label={`${label}: ${value}`}>
        {shown}
      </p>
    </div>
  );
}

export default function KpiStrip({ stats }: { stats: DashboardStats | null }) {
  const s = stats ?? { total_scans: 0, critical_risk: 0, high_risk: 0, medium_risk: 0, low_risk: 0 };
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Tile label="Total scans" value={s.total_scans} icon={<Activity size={18} aria-hidden="true" />} tone="text-cyan-300" glow="" />
      <Tile label="High and critical" value={s.high_risk} icon={<AlertOctagon size={18} aria-hidden="true" />} tone="text-red-400" glow={s.high_risk > 0 ? "shadow-[0_0_28px_rgba(255,59,92,0.18)]" : ""} />
      <Tile label="Medium risk" value={s.medium_risk} icon={<ShieldAlert size={18} aria-hidden="true" />} tone="text-amber-300" glow="" />
      <Tile label="Low risk" value={s.low_risk} icon={<ShieldCheck size={18} aria-hidden="true" />} tone="text-emerald-300" glow="" />
    </div>
  );
}
