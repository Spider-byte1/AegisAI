import type { Agent } from "@/lib/types";

/** What the pipeline panel shows before any scan has run (names match backend/app/services/agents.py). */
export const DEFAULT_AGENTS: Agent[] = [
  { id: "recon", name: "Recon Agent", description: "WHOIS, DNS and TLS reconnaissance", status: "waiting", progress: 0 },
  { id: "nmap", name: "Nmap Intelligence Agent", description: "Port discovery and service fingerprinting", status: "waiting", progress: 0 },
  { id: "cve", name: "CVE Intelligence Agent", description: "Matching service versions to known CVEs", status: "waiting", progress: 0 },
  { id: "risk", name: "Risk Engine", description: "Scoring exposure and severity", status: "waiting", progress: 0 },
  { id: "report", name: "Report Generator", description: "Building the PDF summary report", status: "waiting", progress: 0 },
];
