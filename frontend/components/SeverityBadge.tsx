import type { RiskLevel } from "@/services/types";
import { LEVEL_CLASS } from "./severity";

export default function SeverityBadge({ level }: { level: RiskLevel | null }) {
  if (!level) return <span className="text-muted">-</span>;
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${LEVEL_CLASS[level]}`}>{level}</span>
  );
}
