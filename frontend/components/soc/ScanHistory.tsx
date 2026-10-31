import { Download, Eye, History, Trash2 } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import SeverityBadge from "@/components/ui/SeverityBadge";
import { riskLevelSeverity } from "@/lib/severity";
import type { ScanState, ScanSummary } from "@/lib/types";

const STATUS: Record<ScanState, string> = {
  completed: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  running: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
  queued: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
  failed: "border-red-500/40 bg-red-500/10 text-red-300",
};

interface Props {
  scans: ScanSummary[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onDownload: (id: number, target: string) => void;
  onDelete: (id: number) => void;
  error?: string;
}

export default function ScanHistory({ scans, selectedId, onSelect, onDownload, onDelete, error }: Props) {
  return (
    <GlassCard title="Scan history" subtitle={`${scans.length} scan${scans.length === 1 ? "" : "s"}`} icon={<History size={16} aria-hidden="true" />}>
      {error && <p role="alert" className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      {scans.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">No scans yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead>
              <tr className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                <th className="pb-2 pr-3 font-medium">Target</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Risk</th>
                <th className="pb-2 pr-3 font-medium">Score</th>
                <th className="pb-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((s) => {
                const done = s.status === "completed";
                return (
                  <tr key={s.id} data-selected={selectedId === s.id} className={`border-t border-white/5 ${selectedId === s.id ? "bg-cyan-400/5" : ""}`}>
                    <td className="py-2.5 pr-3 font-mono text-slate-100">{s.target}</td>
                    <td className="py-2.5 pr-3"><span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STATUS[s.status]}`}>{s.status}</span></td>
                    <td className="py-2.5 pr-3">{s.risk && s.risk !== "UNKNOWN" ? <SeverityBadge severity={riskLevelSeverity(s.risk)} label={s.risk} /> : <span className="text-slate-600">-</span>}</td>
                    <td className="py-2.5 pr-3 font-mono text-slate-300">{s.risk_score ?? "-"}</td>
                    <td className="py-2.5">
                      <div className="flex justify-end gap-1.5">
                        {done && (
                          <>
                            <button onClick={() => onSelect(s.id)} aria-label={`View analysis of ${s.target}`} className="flex items-center gap-1 rounded-md border border-cyan-400/40 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-400/10"><Eye size={12} aria-hidden="true" />View</button>
                            <button onClick={() => onDownload(s.id, s.target)} aria-label={`Download PDF report for ${s.target}`} className="flex items-center gap-1 rounded-md border border-violet-400/40 px-2 py-1 text-xs text-violet-200 hover:bg-violet-400/10"><Download size={12} aria-hidden="true" />PDF</button>
                          </>
                        )}
                        <button onClick={() => onDelete(s.id)} aria-label={`Delete scan of ${s.target}`} className="grid h-7 w-7 place-items-center rounded-md border border-white/10 text-slate-400 hover:border-red-400/50 hover:text-red-300"><Trash2 size={13} aria-hidden="true" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
}
