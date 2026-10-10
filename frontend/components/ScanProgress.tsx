import { STAGES } from "./severity";

export default function ScanProgress({ stage, progress, failed }: { stage: string; progress: number; failed?: boolean }) {
  const current = STAGES.findIndex(([key]) => key === stage);
  return (
    <div role="status" aria-live="polite">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="font-display text-lg font-semibold">
          {failed ? "Scan failed" : stage === "completed" ? "Scan complete" : "Scanning"}
        </p>
        <p className="text-sm text-muted">{progress}%</p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500 ${failed ? "bg-sev-critical" : "bg-brand"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <ol className="mt-4 grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-5 lg:grid-cols-9">
        {STAGES.map(([key, label], i) => {
          const done = stage === "completed" || i < current;
          const active = i === current && stage !== "completed" && !failed;
          return (
            <li key={key} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className={`h-2.5 w-2.5 shrink-0 rounded-full border ${
                  done ? "border-brand bg-brand" : active ? "animate-pulse border-brand bg-brand-tint motion-reduce:animate-none" : "border-line bg-surface"
                }`}
              />
              <span className={done || active ? "text-ink" : "text-muted"}>{label}</span>
              {done && <span className="sr-only">(done)</span>}
              {active && <span className="sr-only">(in progress)</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
