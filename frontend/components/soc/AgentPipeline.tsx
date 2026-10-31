import { Bug, BrainCircuit, Check, FileText, Radar, Search, X, type LucideIcon } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import ProgressBar from "@/components/ui/ProgressBar";
import { DEFAULT_AGENTS } from "@/lib/agents";
import type { Agent, AgentId, AgentStatus } from "@/lib/types";

const ICONS: Record<AgentId, LucideIcon> = { recon: Search, nmap: Radar, cve: Bug, risk: BrainCircuit, report: FileText };

const LOOK: Record<AgentStatus, { label: string; badge: string; ring: string; tone: "cyan" | "green" | "red" | "slate" }> = {
  running: { label: "RUNNING", badge: "border-cyan-400/50 bg-cyan-400/10 text-cyan-300", ring: "border-cyan-400/60 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.45)]", tone: "cyan" },
  completed: { label: "COMPLETED", badge: "border-emerald-400/50 bg-emerald-400/10 text-emerald-300", ring: "border-emerald-400/50 text-emerald-300 shadow-[0_0_16px_rgba(57,255,136,0.30)]", tone: "green" },
  waiting: { label: "WAITING", badge: "border-slate-600 bg-slate-700/20 text-slate-400", ring: "border-slate-700 text-slate-500", tone: "slate" },
  failed: { label: "FAILED", badge: "border-red-500/50 bg-red-500/10 text-red-300", ring: "border-red-500/60 text-red-300 shadow-[0_0_16px_rgba(255,59,92,0.35)]", tone: "red" },
};

export default function AgentPipeline({ agents }: { agents: Agent[] }) {
  const list = agents.length > 0 ? agents : DEFAULT_AGENTS;
  const done = list.filter((a) => a.status === "completed").length;
  const running = list.find((a) => a.status === "running");

  return (
    <GlassCard
      title="Autonomous security agents"
      subtitle={running ? `${running.name} is working` : `${done} of ${list.length} agents completed`}
      icon={<Radar size={16} aria-hidden="true" />}
      actions={<span className="font-mono text-[11px] text-slate-400">{done}/{list.length}</span>}
    >
      <ol className="space-y-3">
        {list.map((agent) => {
          const look = LOOK[agent.status];
          const Icon = ICONS[agent.id];
          return (
            <li key={agent.id} data-status={agent.status} className="rounded-xl border border-white/5 bg-black/20 p-3">
              <div className="flex items-center gap-3">
                <div className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-lg border bg-black/40 ${look.ring}`}>
                  {agent.status === "completed" ? <Check size={18} aria-hidden="true" /> : agent.status === "failed" ? <X size={18} aria-hidden="true" /> : <Icon size={18} aria-hidden="true" />}
                  {agent.status === "running" && <span className="animate-soc-pulse absolute inset-0 rounded-lg border border-cyan-400" aria-hidden="true" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-100">{agent.name}</p>
                  <p className="truncate text-xs text-slate-400">{agent.description}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-widest ${look.badge}`}>{look.label}</span>
              </div>
              <div className="mt-3">
                <ProgressBar
                  label={`${agent.name} progress`}
                  value={agent.status === "completed" ? 100 : (agent.progress ?? 0)}
                  indeterminate={agent.status === "running"}
                  tone={look.tone}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </GlassCard>
  );
}
