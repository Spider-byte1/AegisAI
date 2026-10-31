// Shapes returned by the AegisAI API (see backend/app/services/analysis_service.py and api/*.py).

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ScanState = "queued" | "running" | "completed" | "failed";
export type AgentStatus = "waiting" | "running" | "completed" | "failed";
export type AgentId = "recon" | "nmap" | "cve" | "risk" | "report";

export interface Agent {
  id: AgentId;
  name: string;
  description: string;
  status: AgentStatus;
  /** 0 or 100; null while running (a running stage has no sub-progress). */
  progress: number | null;
}

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  port: number | null;
  cve?: string;
  action: string | null;
}

export interface Recommendation {
  priority: string;
  text: string;
  applies_to: string;
}

export interface Alert {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  risk_score: number;
  action: string;
  port: number | null;
  cve: string | null;
}

export type SurfaceKind =
  | "target" | "remote_access" | "web" | "database" | "file_transfer" | "file_sharing"
  | "mail" | "dns" | "management" | "directory" | "other" | "vulnerability" | "tls";

export interface SurfaceNode {
  id: string;
  label: string;
  kind: SurfaceKind;
  port: number | null;
  severity: Severity;
  note: string;
  detail: string;
}

export interface SurfaceEdge {
  source: string;
  target: string;
}

export interface Analysis {
  scan_id: number;
  target: string;
  scanned_at: string | null;
  analyst: {
    title: string;
    target: string;
    security_score: number;
    risk_score: number;
    risk_level: RiskLevel;
    summary: string;
    findings: Finding[];
    recommendations: Recommendation[];
  };
  health: {
    score: number;
    grade: string;
    previous_score: number | null;
    previous_scan_id: number | null;
    delta: number | null;
  };
  executive: {
    business_risk: RiskLevel;
    technical_findings: number;
    critical_issues: number;
    recommended_actions: number;
    statement: string;
  };
  alerts: Alert[];
  surface: { nodes: SurfaceNode[]; edges: SurfaceEdge[] };
  agents: Agent[];
}

export interface ScanStatus {
  id: number;
  target: string;
  status: ScanState;
  progress: number;
  message: string;
  risk: { score: number; level: RiskLevel } | null;
  agents: Agent[];
}

export interface ScanSummary {
  id: number;
  target: string;
  status: ScanState;
  risk: string;
  risk_score: number | null;
  progress: number;
  message: string;
  created_at: string | null;
}

export interface DashboardStats {
  total_scans: number;
  critical_risk: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
}

export interface ActiveScan {
  id: number;
  target: string;
}
