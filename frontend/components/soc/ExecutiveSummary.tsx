import { Briefcase, Download } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import SeverityBadge from "@/components/ui/SeverityBadge";
import { riskLevelSeverity } from "@/lib/severity";
import type { Analysis } from "@/lib/types";

function Stat({ label, value, tone = "text-slate-100" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/25 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

interface Props {
  executive: Analysis["executive"] | null;
  onDownload: () => void;
}

/** A page a manager can read in ten seconds. */
export default function ExecutiveSummary({ executive, onDownload }: Props) {
  return (
    <GlassCard
      title="Executive security report"
      subtitle="Plain-language summary for decision makers"
      icon={<Briefcase size={16} aria-hidden="true" />}
      accent="violet"
      actions={
        executive && (
          <button onClick={onDownload} className="flex items-center gap-1.5 rounded-lg border border-violet-400/40 bg-violet-400/10 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-400/20">
            <Download size={14} aria-hidden="true" /> PDF
          </button>
        )
      }
    >
      {!executive ? (
        <p className="py-6 text-center text-sm text-slate-400">The executive summary appears after your first scan.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/25 p-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">Business risk</span>
            <SeverityBadge severity={riskLevelSeverity(executive.business_risk)} label={executive.business_risk} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Technical findings" value={executive.technical_findings} />
            <Stat label="Critical issues" value={executive.critical_issues} tone={executive.critical_issues > 0 ? "text-red-400" : "text-emerald-300"} />
            <Stat label="Recommended actions" value={executive.recommended_actions} tone="text-cyan-300" />
          </div>
          <p className="text-sm leading-relaxed text-slate-300">{executive.statement}</p>
        </div>
      )}
    </GlassCard>
  );
}
