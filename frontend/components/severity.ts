import type { RiskLevel } from "@/services/types";

export const LEVEL_HEX: Record<RiskLevel, string> = {
  Low: "#2E8B6A",
  Medium: "#B8860B",
  High: "#E0692B",
  Critical: "#C42B3A",
};

export const LEVEL_CLASS: Record<RiskLevel, string> = {
  Low: "bg-sev-low/10 text-sev-low",
  Medium: "bg-sev-medium/10 text-sev-medium",
  High: "bg-sev-high/10 text-sev-high",
  Critical: "bg-sev-critical/10 text-sev-critical",
};

export const STAGES = [
  ["queued", "Queued"],
  ["recon", "Recon"],
  ["dns", "DNS"],
  ["ssl", "TLS"],
  ["nmap", "Port scan"],
  ["service_detection", "Services"],
  ["cve_analysis", "CVE match"],
  ["risk_analysis", "Risk"],
  ["report_generation", "Report"],
] as const;
