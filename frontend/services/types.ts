export type RiskLevel = "Low" | "Medium" | "High" | "Critical";
export type ScanState = "queued" | "running" | "completed" | "failed";

export interface ScanSummary {
  id: number;
  target: string;
  status: ScanState;
  stage: string;
  progress: number;
  risk_score: number | null;
  risk_level: RiskLevel | null;
  report_file: string | null;
  created_at: string;
}

export interface Port {
  port: number;
  protocol: string;
  service: string;
  product?: string;
  version?: string;
  banner?: string;
}

export interface Vulnerability {
  cve: string;
  severity: RiskLevel;
  cvss: number;
  known_exploited: boolean;
  description: string;
  port: number;
  service?: string;
  version?: string;
}

export interface Recommendation {
  priority: "Immediate" | "High" | "Medium" | "Low";
  title: string;
  issue: string;
  why: string;
  fix: string;
}

export interface ScanResults {
  target: string;
  target_type: string;
  scan_method: string;
  warnings: string[];
  whois: { available: boolean; registrar?: string; creation_date?: string; expiration_date?: string; name_servers?: string[] };
  dns: Record<string, string[]>;
  ssl: { available: boolean; issuer?: string; valid_to?: string; protocol?: string; cipher?: string; issues?: string[]; error?: string };
  http: { available: boolean; missing_headers?: string[]; server?: string };
  ports: Port[];
  vulnerabilities: Vulnerability[];
  risk: { score: number; level: RiskLevel; factors: { factor: string; points: number }[] };
  recommendations: Recommendation[];
  executive_summary: { source: string; text: string };
}

export interface ScanDetail extends ScanSummary {
  results: ScanResults | null;
  error: string | null;
  completed_at: string | null;
}

export interface HistoryPage {
  items: ScanSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface Dashboard {
  total_scans: number;
  active_scans: number;
  critical: number;
  high: number;
  reports: number;
  average_risk: number;
  recent_scans: ScanSummary[];
  risk_distribution: Record<RiskLevel, number>;
  top_ports: { port: string; count: number }[];
  weekly_activity: { date: string; scans: number }[];
  vulnerabilities_by_severity: Record<RiskLevel, number>;
}
