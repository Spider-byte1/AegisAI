"use client";

import { useState } from "react";
import { BrainCircuit, Download, MessageSquareText } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import SeverityBadge from "@/components/ui/SeverityBadge";
import { SEVERITY_STYLES, riskLevelSeverity } from "@/lib/severity";
import type { Analysis } from "@/lib/types";

interface Props {
  analysis: Analysis | null;
  loading: boolean;
  onExplain: () => void;
  onDownload: () => void;
}

const INITIAL_FINDINGS = 6;

export default function AnalystReport({ analysis, loading, onExplain, onDownload }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (!analysis) {
    return (
      <GlassCard title="AegisAI analyst report" subtitle="Automatic explanation of scan results" icon={<BrainCircuit size={16} aria-hidden="true" />}>
        <p className="py-6 text-center text-sm text-slate-400">
          {loading ? "Loading the latest analysis..." : "No analysis yet. Launch a scan and the analyst will explain the results here."}
        </p>
      </GlassCard>
    );
  }

  const { analyst } = analysis;
  const findings = showAll ? analyst.findings : analyst.findings.slice(0, INITIAL_FINDINGS);
  const hidden = analyst.findings.length - INITIAL_FINDINGS;

  return (
    <GlassCard
      title={analyst.title}
      subtitle={`Scan #${analysis.scan_id}${analysis.scanned_at ? ` · ${analysis.scanned_at}` : ""}`}
      icon={<BrainCircuit size={16} aria-hidden="true" />}
      actions={
        <div className="flex items-center gap-2">
          <button onClick={onExplain} className="flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-400/20">
            <MessageSquareText size={14} aria-hidden="true" /> Ask Copilot
          </button>
          <button onClick={onDownload} className="flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-400/20">
            <Download size={14} aria-hidden="true" /> PDF report
          </button>
        </div>
      }
    >
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Target</dt>
          <dd className="mt-1 truncate font-mono text-sm text-slate-100">{analyst.target}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Security score</dt>
          <dd className="mt-1 font-mono text-sm text-slate-100">{analyst.security_score}/100</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Risk level</dt>
          <dd className="mt-1"><SeverityBadge severity={riskLevelSeverity(analyst.risk_level)} label={analyst.risk_level} /></dd>
        </div>
      </dl>

      <p className="mt-4 rounded-xl border border-white/5 bg-black/25 p-3 text-sm leading-relaxed text-slate-300">{analyst.summary}</p>

      <h3 className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-300">Analysis</h3>
      <ul className="mt-2 space-y-2">
        {findings.map((f) => {
          const s = SEVERITY_STYLES[f.severity];
          return (
            <li key={f.id} className="flex items-start gap-3 rounded-lg border border-white/5 bg-black/20 p-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-100">{f.title}</p>
                <p className="mt-0.5 text-xs text-slate-400">{f.detail}</p>
              </div>
              <SeverityBadge severity={f.severity} />
            </li>
          );
        })}
      </ul>
      {hidden > 0 && (
        <button onClick={() => setShowAll((v) => !v)} className="mt-2 text-xs text-cyan-300 underline-offset-2 hover:underline">
          {showAll ? "Show fewer" : `Show all ${analyst.findings.length} findings`}
        </button>
      )}

      <h3 className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-300">Recommendations</h3>
      {analyst.recommendations.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">No actions required.</p>
      ) : (
        <ol className="mt-2 space-y-2">
          {analyst.recommendations.map((r, i) => (
            <li key={`${r.priority}-${i}`} className="flex gap-3 text-sm text-slate-300">
              <span className="mt-0.5 shrink-0 rounded border border-emerald-400/30 bg-emerald-400/10 px-1.5 font-mono text-[10px] leading-5 text-emerald-300">{r.priority.toUpperCase()}</span>
              <span>
                {r.text} <span className="text-xs text-slate-500">({r.applies_to})</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </GlassCard>
  );
}
