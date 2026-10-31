import { SEVERITY_STYLES } from "@/lib/severity";
import type { Severity } from "@/lib/types";

export default function SeverityBadge({ severity, label }: { severity: Severity; label?: string }) {
  const s = SEVERITY_STYLES[severity];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider ${s.text} ${s.border} ${s.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {label ?? s.label}
    </span>
  );
}
