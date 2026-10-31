import { vi } from "vitest";
import type { Agent, Analysis, ScanStatus, ScanSummary } from "@/lib/types";

// ------------------------------------------------------------------ sample data
export const AGENTS_DONE: Agent[] = [
  { id: "recon", name: "Recon Agent", description: "WHOIS, DNS and TLS reconnaissance", status: "completed", progress: 100 },
  { id: "nmap", name: "Nmap Intelligence Agent", description: "Port discovery and service fingerprinting", status: "completed", progress: 100 },
  { id: "cve", name: "CVE Intelligence Agent", description: "Matching service versions to known CVEs", status: "completed", progress: 100 },
  { id: "risk", name: "Risk Engine", description: "Scoring exposure and severity", status: "completed", progress: 100 },
  { id: "report", name: "Report Generator", description: "Building the PDF summary report", status: "completed", progress: 100 },
];

export function agentsAt(done: number, running: boolean): Agent[] {
  return AGENTS_DONE.map((a, i) =>
    i < done ? a : i === done && running ? { ...a, status: "running", progress: null } : { ...a, status: "waiting", progress: 0 }
  );
}

export function sampleAnalysis(over: Partial<Analysis> = {}): Analysis {
  const analysis: Analysis = {
    scan_id: 12,
    target: "example.com",
    scanned_at: "2026-10-10 12:00:00 UTC",
    analyst: {
      title: "AegisAI Analyst Report",
      target: "example.com",
      security_score: 82,
      risk_score: 18,
      risk_level: "LOW",
      summary: "AegisAI assessed example.com. Although the overall score is low, 2 findings are rated Critical priority.",
      findings: [
        { id: "port:23", severity: "critical", title: "Exposed Telnet service detected on port 23", detail: "Telnet is unencrypted. Disable it and use SSH instead.", port: 23, action: "Disable Telnet." },
        { id: "cve:CVE-2021-41773", severity: "high", title: "CVE-2021-41773: Apache HTTP Server path traversal / file disclosure", detail: "Matched on port 80 running Apache httpd 2.4.49 (CVSS 7.5).", port: 80, cve: "CVE-2021-41773", action: "Upgrade Apache." },
        { id: "port:22", severity: "low", title: "Exposed SSH service detected on port 22", detail: "Use key-based SSH login.", port: 22, action: "Harden SSH." },
        { id: "info:cve", severity: "info", title: "Open port 8080 (http-alt)", detail: "No specific risk identified for this service.", port: 8080, action: null },
      ],
      recommendations: [
        { priority: "Immediate", text: "Update Apache HTTP Server to the latest stable version.", applies_to: "Port 80" },
        { priority: "Critical", text: "Telnet is unencrypted. Disable it and use SSH instead.", applies_to: "Port 23" },
        { priority: "Low", text: "Use key-based SSH login or multi-factor authentication.", applies_to: "Port 22" },
      ],
    },
    health: { score: 82, grade: "B+", previous_score: 70, previous_scan_id: 5, delta: 12 },
    executive: { business_risk: "HIGH", technical_findings: 3, critical_issues: 1, recommended_actions: 3, statement: "example.com currently presents high business risk. 3 issues need attention, including 1 critical." },
    alerts: [
      { id: "port:23", severity: "critical", title: "Exposed Telnet service detected on port 23", detail: "Telnet is unencrypted.", risk_score: 90, action: "Disable Telnet and use SSH instead.", port: 23, cve: null },
      { id: "cve:CVE-2021-41773", severity: "high", title: "CVE-2021-41773: Apache HTTP Server path traversal / file disclosure", detail: "Matched on port 80.", risk_score: 75, action: "Upgrade or patch Apache httpd immediately.", port: 80, cve: "CVE-2021-41773" },
    ],
    surface: {
      nodes: [
        { id: "target", label: "example.com", kind: "target", port: null, severity: "low", note: "Scanned target", detail: "Overall risk LOW" },
        { id: "port-22", label: "SSH 22", kind: "remote_access", port: 22, severity: "low", note: "Possible entry point: remote administration", detail: "OpenSSH 9.6p1" },
        { id: "port-23", label: "Telnet 23", kind: "remote_access", port: 23, severity: "critical", note: "Possible entry point: remote administration", detail: "telnet" },
        { id: "port-80", label: "HTTP 80", kind: "web", port: 80, severity: "high", note: "Web attack surface: application and server flaws", detail: "Apache httpd 2.4.49" },
        { id: "cve-CVE-2021-41773-80", label: "CVE-2021-41773", kind: "vulnerability", port: 80, severity: "high", note: "Known vulnerability", detail: "Apache HTTP Server path traversal / file disclosure" },
        { id: "dns-NS-1", label: "NS a.iana-servers.net.", kind: "dns", port: null, severity: "info", note: "DNS record", detail: "NS record: a.iana-servers.net." },
      ],
      edges: [
        { source: "target", target: "port-22" }, { source: "target", target: "port-23" }, { source: "target", target: "port-80" },
        { source: "port-80", target: "cve-CVE-2021-41773-80" }, { source: "target", target: "dns-NS-1" },
      ],
    },
    agents: AGENTS_DONE,
    ...over,
  };
  // keep the target consistent everywhere when a test overrides it
  if (over.target) analysis.analyst = { ...analysis.analyst, target: over.target };
  return analysis;
}

export const SAMPLE_HISTORY: ScanSummary[] = [
  { id: 12, target: "example.com", status: "completed", risk: "LOW", risk_score: 18, progress: 100, message: "", created_at: null },
  { id: 11, target: "slow.example.org", status: "running", risk: "UNKNOWN", risk_score: null, progress: 40, message: "", created_at: null },
  { id: 10, target: "broken.example.org", status: "failed", risk: "UNKNOWN", risk_score: null, progress: 20, message: "", created_at: null },
];

export const status = (over: Partial<ScanStatus>): ScanStatus => ({
  id: 9, target: "new.example.org", status: "running", progress: 0, message: "", risk: null, agents: [], ...over,
});

// ------------------------------------------------------------------ fetch + audio fakes
export const json = (statusCode: number, body: unknown) =>
  new Response(JSON.stringify(body), { status: statusCode, headers: { "Content-Type": "application/json" } });

export const pdfResponse = () =>
  new Response(new TextEncoder().encode("%PDF-1.4 fake"), { status: 200, headers: { "Content-Type": "application/pdf" } });

/** A response body that tests feed piece by piece, like a network stream. */
export function liveStream(signal?: AbortSignal) {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({ start(c) { controller = c; } });
  signal?.addEventListener("abort", () => {
    try { controller.error(new DOMException("Aborted", "AbortError")); } catch { /* already closed */ }
  });
  return {
    response: new Response(body, { status: 200, headers: { "Content-Type": "application/x-ndjson" } }),
    push: (text: string) => controller.enqueue(encoder.encode(text)),
    close: () => controller.close(),
  };
}
export const ndjson = (o: unknown) => JSON.stringify(o) + "\n";
export const delta = (text: string) => ndjson({ type: "delta", text });
export const done = (answer: string, extra: Record<string, unknown> = {}) =>
  ndjson({ type: "done", answer, mode: "llm", sources: [], notice: null, ...extra });
export function fullStream(...lines: string[]): Response {
  const s = liveStream();
  lines.forEach(s.push);
  s.close();
  return s.response;
}

export interface Call {
  url: string;
  path: string;
  method: string;
  auth: string | null;
  body: Record<string, unknown> | null;
  signal?: AbortSignal;
}
export type Handler = (call: Call) => Response | Promise<Response>;

/** Routes are "METHOD /path"; `:id` matches one path segment. Unmatched requests get a 404. */
export function installApi(routes: Record<string, Handler>) {
  const calls: Call[] = [];
  const compiled = Object.entries(routes).map(([key, handler]) => {
    const [method, pattern] = key.split(" ");
    return { method, regex: new RegExp(`^${pattern.replace(/:[a-z]+/g, "[^/]+")}$`), handler };
  });
  vi.stubGlobal("fetch", vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    const method = init?.method ?? "GET";
    const call: Call = {
      url: input, path: url.pathname, method,
      auth: new Headers(init?.headers).get("Authorization"),
      body: init?.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : null,
      signal: init?.signal ?? undefined,
    };
    calls.push(call);
    const match = compiled.find((r) => r.method === method && r.regex.test(url.pathname));
    return match ? match.handler(call) : json(404, { detail: "not found" });
  }));
  return { calls, count: (method: string, path: RegExp) => calls.filter((c) => c.method === method && path.test(c.path)).length };
}

/** Records the oscillators the sound module creates, so tests can hear what would play. */
export const audio = { oscillators: [] as { type: string; freq: number }[], contexts: 0 };
export function installFakeAudio() {
  class FakeContext {
    currentTime = 0;
    state = "running";
    destination = {};
    constructor() { audio.contexts += 1; }
    resume() { return Promise.resolve(); }
    createOscillator() {
      const osc = { type: "sine", frequency: { value: 0 }, connect: vi.fn(), stop: vi.fn(), start: vi.fn() };
      audio.oscillators.push({ get type() { return osc.type; }, get freq() { return osc.frequency.value; } });
      return osc;
    }
    createGain() { return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() }; }
  }
  Object.defineProperty(window, "AudioContext", { value: FakeContext, configurable: true, writable: true });
}
