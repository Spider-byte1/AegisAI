"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe2 } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import SeverityBadge from "@/components/ui/SeverityBadge";
import { SEVERITY_STYLES } from "@/lib/severity";
import { PROTECTED_ASSET, regionTotals, simulateEvent, simulateEvents } from "@/lib/threatSim";
import { MAP_HEIGHT, MAP_WIDTH, landPaths, project } from "@/lib/worldMap";

const SEED = 7;
const WINDOW = 60;
const ARCS = 6;
const FEED = 6;

/**
 * Optional "global threat" wall display. Everything on it is SIMULATED: AegisAI has no worldwide
 * sensor network, and the panel says so at all times. Off by default.
 */
export default function ThreatMap({ tickMs = 1800 }: { tickMs?: number }) {
  const [enabled, setEnabled] = useState(false);
  const [paths, setPaths] = useState<string[] | null>(null);
  const [tick, setTick] = useState(8);

  // The map outline (about 100 KB) is only downloaded when the panel is switched on.
  useEffect(() => {
    if (!enabled || paths) return;
    let cancelled = false;
    import("world-atlas/countries-110m.json")
      .then((module) => !cancelled && setPaths(landPaths(module.default)))
      .catch(() => !cancelled && setPaths([]));
    return () => {
      cancelled = true;
    };
  }, [enabled, paths]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setTick((t) => t + 1), tickMs);
    return () => clearInterval(timer);
  }, [enabled, tickMs]);

  const arcs = useMemo(() => Array.from({ length: Math.min(tick + 1, ARCS) }, (_, i) => simulateEvent(SEED, tick - i)), [tick]);
  const feed = useMemo(() => Array.from({ length: Math.min(tick + 1, FEED) }, (_, i) => simulateEvent(SEED, tick - i)), [tick]);
  const totals = useMemo(
    () => regionTotals(simulateEvents(SEED, Math.min(tick + 1, WINDOW), Math.max(0, tick - WINDOW + 1))),
    [tick]
  );

  const asset = project(PROTECTED_ASSET.lon, PROTECTED_ASSET.lat);
  const top = totals.slice(0, 5);
  const maxCount = top[0]?.count ?? 1;

  const toggle = (
    <button
      role="switch" aria-checked={enabled} onClick={() => setEnabled((v) => !v)} aria-label="Show simulated threat map"
      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${enabled ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-300" : "border-white/10 text-slate-400 hover:text-white"}`}
    >
      <span className={`h-2 w-2 rounded-full ${enabled ? "bg-cyan-300 shadow-[0_0_8px_#22d3ee]" : "bg-slate-600"}`} aria-hidden="true" />
      {enabled ? "Simulation on" : "Simulation off"}
    </button>
  );

  return (
    <GlassCard title="Global cyber threat map" subtitle="Demonstration visualisation" icon={<Globe2 size={16} aria-hidden="true" />} accent="violet" actions={toggle}>
      <p className="mb-4 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 font-mono text-[11px] tracking-wider text-amber-200" role="note">
        SIMULATED TELEMETRY: demonstration data only. AegisAI does not collect real global attack data, and the regions shown are illustrative.
      </p>

      {!enabled ? (
        <p className="py-8 text-center text-sm text-slate-400">
          Switch the simulation on to preview a SOC-wall style threat map. To show real data, connect a feed from your firewall or SIEM (see <code className="text-slate-300">lib/threatSim.ts</code>).
        </p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
          <div className="scanlines overflow-hidden rounded-xl border border-violet-400/20 bg-[#050b16]">
            <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="h-auto w-full" role="img" aria-label="Simulated global threat map">
              {[-120, -60, 0, 60, 120].map((lon) => <line key={`lon${lon}`} x1={project(lon, 0)[0]} y1={0} x2={project(lon, 0)[0]} y2={MAP_HEIGHT} stroke="#22d3ee" strokeOpacity="0.07" />)}
              {[-30, 0, 30, 60].map((lat) => <line key={`lat${lat}`} x1={0} y1={project(0, lat)[1]} x2={MAP_WIDTH} y2={project(0, lat)[1]} stroke="#22d3ee" strokeOpacity="0.07" />)}

              {paths?.map((d, i) => <path key={i} d={d} fill="rgba(34,211,238,0.07)" stroke="rgba(34,211,238,0.32)" strokeWidth="0.4" />)}

              {top.map(({ region, count }, i) => {
                const [x, y] = project(region.lon, region.lat);
                return (
                  <g key={region.id}>
                    <circle cx={x} cy={y} r={5 + (count / maxCount) * 12} fill="#ff3b5c" fillOpacity="0.14" className={i === 0 ? "animate-soc-node" : undefined} />
                    <circle cx={x} cy={y} r="3" fill="#ff3b5c" />
                  </g>
                );
              })}

              {arcs.map((e) => {
                const [x1, y1] = project(e.region.lon, e.region.lat);
                const mx = (x1 + asset[0]) / 2;
                const my = Math.min(y1, asset[1]) - Math.hypot(asset[0] - x1, asset[1] - y1) * 0.28;
                return (
                  <path key={e.id} d={`M${x1} ${y1} Q${mx} ${my} ${asset[0]} ${asset[1]}`} fill="none" stroke={SEVERITY_STYLES[e.severity].hex} strokeWidth="1.6" strokeLinecap="round" pathLength={1} className="animate-soc-arc" />
                );
              })}

              <circle cx={asset[0]} cy={asset[1]} r="5" fill="#39ff88" />
              <circle cx={asset[0]} cy={asset[1]} r="5" fill="none" stroke="#39ff88" className="animate-soc-node" />
              <text x={asset[0] + 9} y={asset[1] - 8} fontSize="10" fill="#39ff88" className="font-mono">{PROTECTED_ASSET.name}</text>
            </svg>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-red-300">Suspicious regions (simulated)</h3>
              <ul className="mt-2 space-y-2">
                {top.map(({ region, count }) => (
                  <li key={region.id} className="text-xs text-slate-300">
                    <div className="flex justify-between"><span>{region.name}</span><span className="font-mono text-slate-400">{count}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-800"><div className="h-full rounded-full bg-red-500/80" style={{ width: `${(count / maxCount) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-300">Live activity (simulated)</h3>
              <ul className="mt-2 space-y-2" aria-live="off">
                {feed.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/25 px-2.5 py-1.5 text-xs">
                    <span className="min-w-0 truncate text-slate-300">{e.kind} <span className="text-slate-500">from {e.region.name}</span></span>
                    <SeverityBadge severity={e.severity} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
