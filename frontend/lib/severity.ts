import type { RiskLevel, Severity } from "@/lib/types";

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

export interface SeverityStyle {
  label: string;
  /** Colour used inside SVG (hex) */
  hex: string;
  text: string;
  border: string;
  bg: string;
  glow: string;
  dot: string;
}

// Full class names on purpose: Tailwind only generates classes it can find as literal strings.
export const SEVERITY_STYLES: Record<Severity, SeverityStyle> = {
  critical: { label: "CRITICAL", hex: "#ff3b5c", text: "text-red-400", border: "border-red-500/50", bg: "bg-red-500/10", glow: "shadow-[0_0_24px_rgba(255,59,92,0.35)]", dot: "bg-red-500" },
  high: { label: "HIGH", hex: "#ff7a1a", text: "text-orange-400", border: "border-orange-500/50", bg: "bg-orange-500/10", glow: "shadow-[0_0_24px_rgba(255,122,26,0.30)]", dot: "bg-orange-500" },
  medium: { label: "MEDIUM", hex: "#ffc53d", text: "text-amber-300", border: "border-amber-400/50", bg: "bg-amber-400/10", glow: "shadow-[0_0_20px_rgba(255,197,61,0.25)]", dot: "bg-amber-400" },
  low: { label: "LOW", hex: "#39ff88", text: "text-emerald-300", border: "border-emerald-400/50", bg: "bg-emerald-400/10", glow: "shadow-[0_0_20px_rgba(57,255,136,0.22)]", dot: "bg-emerald-400" },
  info: { label: "INFO", hex: "#22d3ee", text: "text-cyan-300", border: "border-cyan-400/40", bg: "bg-cyan-400/10", glow: "shadow-[0_0_16px_rgba(34,211,238,0.20)]", dot: "bg-cyan-400" },
};

export function toSeverity(value: string | null | undefined): Severity {
  const v = (value ?? "").toLowerCase();
  return (SEVERITY_ORDER as string[]).includes(v) ? (v as Severity) : "info";
}

export function riskLevelSeverity(level: RiskLevel | string | null | undefined): Severity {
  switch ((level ?? "").toUpperCase()) {
    case "CRITICAL": return "critical";
    case "HIGH": return "high";
    case "MEDIUM": return "medium";
    case "LOW": return "low";
    default: return "info";
  }
}

export function severityRank(severity: Severity): number {
  return SEVERITY_ORDER.length - 1 - SEVERITY_ORDER.indexOf(severity);
}
