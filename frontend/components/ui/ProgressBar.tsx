type Tone = "cyan" | "green" | "red" | "slate";

const FILL: Record<Tone, string> = {
  cyan: "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.7)]",
  green: "bg-emerald-400 shadow-[0_0_10px_rgba(57,255,136,0.6)]",
  red: "bg-red-500 shadow-[0_0_10px_rgba(255,59,92,0.6)]",
  slate: "bg-slate-600",
};

interface Props {
  /** 0-100. Ignored when `indeterminate`. */
  value: number;
  indeterminate?: boolean;
  tone?: Tone;
  label: string;
}

export default function ProgressBar({ value, indeterminate = false, tone = "cyan", label }: Props) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : value}
      className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80"
    >
      {indeterminate ? (
        <div className="animate-soc-shimmer h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
      ) : (
        <div className={`h-full rounded-full transition-[width] duration-700 ${FILL[tone]}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      )}
    </div>
  );
}
