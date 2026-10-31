"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { Minus, Network, Plus } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import SeverityBadge from "@/components/ui/SeverityBadge";
import { SEVERITY_STYLES, severityRank } from "@/lib/severity";
import { layoutSurface, type PositionedNode } from "@/lib/surfaceLayout";
import type { Analysis, SurfaceKind } from "@/lib/types";

const TAGS: Partial<Record<SurfaceKind, string>> = {
  remote_access: "ENTRY POINT",
  web: "WEB ATTACK",
  database: "DATA EXPOSURE",
  file_transfer: "FILE EXPOSURE",
  file_sharing: "FILE EXPOSURE",
  management: "MGMT SURFACE",
};

function nodeGlyph(node: PositionedNode): string {
  if (node.kind === "vulnerability") return "!";
  if (node.kind === "tls") return "TLS";
  if (node.kind === "dns") return "DNS";
  if (node.port !== null) return String(node.port);
  return "";
}

/**
 * Radial map of everything the scan discovered: the target in the middle, its open services around it,
 * and the vulnerabilities attached to each service. Click or press Enter on a node to inspect it.
 */
export default function AttackSurfaceMap({ surface }: { surface: Analysis["surface"] | null }) {
  const layout = useMemo(() => (surface ? layoutSurface(surface.nodes, surface.edges) : null), [surface]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  if (!layout || layout.nodes.length === 0) {
    return (
      <GlassCard title="Attack surface map" subtitle="Discovered infrastructure" icon={<Network size={16} aria-hidden="true" />}>
        <p className="py-10 text-center text-sm text-slate-400">The map is drawn from your scan results. Launch a scan to see the exposed services.</p>
      </GlassCard>
    );
  }

  const cx = layout.width / 2;
  const cy = layout.height / 2;
  const selected = layout.nodes.find((n) => n.id === selectedId) ?? null;
  const related = selected ? layout.edges.filter((e) => e.source.id === selected.id).map((e) => e.target) : [];
  const serviceCount = layout.nodes.filter((n) => n.port !== null && n.kind !== "vulnerability" && n.kind !== "tls").length;

  const onKey = (e: KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelectedId(id);
    }
  };

  return (
    <GlassCard
      title="Attack surface map"
      subtitle={`${serviceCount} exposed service${serviceCount === 1 ? "" : "s"} discovered`}
      icon={<Network size={16} aria-hidden="true" />}
      actions={
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom((z) => Math.max(0.8, +(z - 0.2).toFixed(1)))} aria-label="Zoom out" className="grid h-7 w-7 place-items-center rounded-md border border-white/10 text-slate-300 hover:text-white"><Minus size={14} aria-hidden="true" /></button>
          <button onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.2).toFixed(1)))} aria-label="Zoom in" className="grid h-7 w-7 place-items-center rounded-md border border-white/10 text-slate-300 hover:text-white"><Plus size={14} aria-hidden="true" /></button>
        </div>
      }
    >
      <div className="grid gap-4 2xl:grid-cols-[1fr_18rem]">
        <div className="scanlines overflow-hidden rounded-xl border border-cyan-400/15 bg-[#050b16]">
          <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="h-auto w-full" role="group" aria-label="Attack surface map">
            <defs>
              <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.22" />
              </linearGradient>
              <radialGradient id="core" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
              </radialGradient>
            </defs>

            <g transform={`translate(${cx} ${cy}) scale(${zoom}) translate(${-cx} ${-cy})`}>
              <ellipse cx={cx} cy={cy} rx={layout.width * 0.5} ry={layout.height * 0.5} fill="url(#core)" />
              <ellipse cx={cx} cy={cy} rx={layout.width * 0.26} ry={layout.height * 0.27} fill="none" stroke="#22d3ee" strokeOpacity="0.18" strokeDasharray="3 6" />
              <ellipse cx={cx} cy={cy} rx={layout.width * 0.42} ry={layout.height * 0.43} fill="none" stroke="#22d3ee" strokeOpacity="0.12" strokeDasharray="3 8" />
              <g className="animate-soc-sweep" aria-hidden="true">
                <path d={`M${cx} ${cy} L${cx + layout.width * 0.46} ${cy} A${layout.width * 0.46} ${layout.width * 0.46} 0 0 0 ${cx + layout.width * 0.46 * Math.cos(-0.45)} ${cy + layout.width * 0.46 * Math.sin(-0.45)} Z`} fill="url(#sweep)" />
              </g>

              {layout.edges.map((e) => {
                const hot = severityRank(e.target.severity) >= severityRank("medium");
                return (
                  <line
                    key={e.id} x1={e.source.x} y1={e.source.y} x2={e.target.x} y2={e.target.y}
                    stroke={SEVERITY_STYLES[e.target.severity].hex} strokeOpacity={hot ? 0.75 : 0.35} strokeWidth={hot ? 1.6 : 1}
                    className={hot ? "animate-soc-dash" : undefined}
                    opacity={selected && selected.id !== e.source.id && selected.id !== e.target.id ? 0.35 : 1}
                  />
                );
              })}

              {layout.nodes.map((n) => {
                const hex = SEVERITY_STYLES[n.severity].hex;
                const hot = severityRank(n.severity) >= severityRank("high");
                const isSelected = selected?.id === n.id;
                const tag = TAGS[n.kind];
                return (
                  <g
                    key={n.id} role="button" tabIndex={0} aria-label={`${n.label}, ${SEVERITY_STYLES[n.severity].label.toLowerCase()}. ${n.note}`} aria-pressed={isSelected}
                    onClick={() => setSelectedId(n.id)} onKeyDown={(e) => onKey(e, n.id)} className="cursor-pointer outline-none"
                  >
                    {hot && <circle cx={n.x} cy={n.y} r={n.r} fill="none" stroke={hex} strokeWidth="1.5" className="animate-soc-node" />}
                    {isSelected && <circle cx={n.x} cy={n.y} r={n.r + 7} fill="none" stroke="#ffffff" strokeOpacity="0.8" strokeDasharray="4 3" />}
                    <circle cx={n.x} cy={n.y} r={n.r} fill="#07101f" stroke={hex} strokeWidth={n.ring === 0 ? 2.5 : 2} style={{ filter: `drop-shadow(0 0 6px ${hex})` }} />
                    {n.ring === 0 && <circle cx={n.x} cy={n.y} r={n.r - 9} fill={hex} fillOpacity="0.35" />}
                    <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={13} fontWeight="700" fill={hex} className="pointer-events-none font-mono">{nodeGlyph(n)}</text>
                    <text x={n.x} y={n.y + n.r + 17} textAnchor="middle" fontSize={n.ring === 2 ? 13 : 14} fill="#e2e8f0" className="pointer-events-none font-mono">{n.label}</text>
                    {tag && <text x={n.x} y={n.y + n.r + 31} textAnchor="middle" fontSize="11" letterSpacing="1.2" fill={hex} fillOpacity="0.9" className="pointer-events-none font-mono">{tag}</text>}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <aside aria-live="polite" className="rounded-xl border border-white/5 bg-black/25 p-4 text-sm">
          {!selected ? (
            <>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">Inspector</p>
              <p className="mt-2 text-slate-400">Select a node to see what it exposes and why it matters.</p>
              <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-400 2xl:block 2xl:space-y-1.5">
                {(["critical", "high", "medium", "low", "info"] as const).map((s) => (
                  <li key={s} className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${SEVERITY_STYLES[s].dot}`} aria-hidden="true" />{SEVERITY_STYLES[s].label}</li>
                ))}
              </ul>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-mono text-base font-semibold text-slate-100">{selected.label}</h3>
                <SeverityBadge severity={selected.severity} />
              </div>
              <p className="text-cyan-300">{selected.note}</p>
              {selected.detail && <p className="break-words text-slate-300">{selected.detail}</p>}
              {related.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Linked findings</p>
                  <ul className="mt-1 space-y-1">
                    {related.map((r) => (
                      <li key={r.id}><button onClick={() => setSelectedId(r.id)} className="text-left text-xs text-orange-300 hover:underline">{r.label}</button></li>
                    ))}
                  </ul>
                </div>
              )}
              <button onClick={() => setSelectedId(null)} className="text-xs text-slate-400 hover:text-white">Clear selection</button>
            </div>
          )}
        </aside>
      </div>
    </GlassCard>
  );
}
