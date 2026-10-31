import type { Analysis, ScanStatus } from "@/lib/types";

export type TerminalTone = "cmd" | "info" | "ok" | "warn" | "error";

export interface TerminalLine {
  id: string;
  text: string;
  tone: TerminalTone;
}

const line = (scanKey: string, index: number, tone: TerminalTone, text: string): TerminalLine => ({
  id: `${scanKey}-${index}`,
  text,
  tone,
});

export function commandLines(scanKey: string, target: string, startIndex = 0): TerminalLine[] {
  return [line(scanKey, startIndex, "cmd", `$ aegis scan --target ${target} --agents recon,nmap,cve,risk,report`)];
}

/** Lines to print when a new status arrives: one per agent that changed state (derived from the real pipeline). */
export function linesForStatus(prev: ScanStatus | null, next: ScanStatus, scanKey: string, startIndex: number): TerminalLine[] {
  const out: TerminalLine[] = [];
  let i = startIndex;
  for (const agent of next.agents) {
    const before = prev?.agents.find((a) => a.id === agent.id)?.status ?? "waiting";
    if (before === agent.status) continue;
    if (agent.status === "running") out.push(line(scanKey, i++, "info", `▶ ${agent.name}: ${agent.description}`));
    else if (agent.status === "completed") out.push(line(scanKey, i++, "ok", `✔ ${agent.name} completed`));
    else if (agent.status === "failed") out.push(line(scanKey, i++, "error", `✖ ${agent.name} failed`));
  }
  if (next.status === "failed" && prev?.status !== "failed") {
    out.push(line(scanKey, i++, "error", `✖ Scan failed: ${next.message || "unknown error"}`));
  }
  return out;
}

/** Closing lines once the analysis is available. */
export function completionLines(analysis: Analysis, scanKey: string, startIndex: number): TerminalLine[] {
  const { analyst, alerts } = analysis;
  const out: TerminalLine[] = [
    line(scanKey, startIndex, "ok",
      `✔ Scan complete: ${analyst.risk_level} risk, security score ${analyst.security_score}/100, ${alerts.length} alert${alerts.length === 1 ? "" : "s"}`),
  ];
  alerts.slice(0, 3).forEach((a, n) => {
    out.push(line(scanKey, startIndex + 1 + n, a.severity === "critical" || a.severity === "high" ? "error" : "warn",
      `[!] ${a.severity.toUpperCase()} ${a.title}`));
  });
  return out;
}
