import type { ReactNode } from "react";

export type Accent = "cyan" | "green" | "red" | "amber" | "violet";

const ACCENTS: Record<Accent, { border: string; icon: string; line: string }> = {
  cyan: { border: "border-cyan-400/20", icon: "text-cyan-300 bg-cyan-400/10 border-cyan-400/30", line: "via-cyan-400/60" },
  green: { border: "border-emerald-400/20", icon: "text-emerald-300 bg-emerald-400/10 border-emerald-400/30", line: "via-emerald-400/60" },
  red: { border: "border-red-500/25", icon: "text-red-300 bg-red-500/10 border-red-500/30", line: "via-red-500/60" },
  amber: { border: "border-amber-400/20", icon: "text-amber-300 bg-amber-400/10 border-amber-400/30", line: "via-amber-400/60" },
  violet: { border: "border-violet-400/20", icon: "text-violet-300 bg-violet-400/10 border-violet-400/30", line: "via-violet-400/60" },
};

interface Props {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  accent?: Accent;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Frosted-glass panel with a neon accent line and a mono-spaced title bar. */
export default function GlassCard({ title, subtitle, icon, accent = "cyan", actions, className = "", children }: Props) {
  const a = ACCENTS[accent];
  return (
    <section aria-label={title} className={`glass animate-soc-rise relative flex flex-col overflow-hidden rounded-2xl border ${a.border} ${className}`}>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${a.line} to-transparent`} />
      <header className="flex items-center justify-between gap-3 border-b border-white/5 px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {icon && <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${a.icon}`}>{icon}</span>}
          <div className="min-w-0">
            <h2 className="truncate font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200">{title}</h2>
            {subtitle && <p className="truncate text-xs text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {actions}
      </header>
      <div className="flex flex-1 flex-col p-5">{children}</div>
    </section>
  );
}
