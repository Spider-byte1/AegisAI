import { beforeEach, describe, expect, it, vi } from "vitest";
import countries from "world-atlas/countries-110m.json";
import { DEFAULT_AGENTS } from "@/lib/agents";
import { ApiError, apiJson, downloadReport } from "@/lib/api";
import { riskLevelSeverity, severityRank, toSeverity } from "@/lib/severity";
import { SOUND_PATTERNS, playSound, soundStore } from "@/lib/sound";
import { layoutSurface } from "@/lib/surfaceLayout";
import { commandLines, completionLines, linesForStatus } from "@/lib/terminal";
import { regionTotals, simulateEvent, simulateEvents, THREAT_REGIONS } from "@/lib/threatSim";
import { MAP_HEIGHT, MAP_WIDTH, landPaths, project } from "@/lib/worldMap";
import { AGENTS_DONE, agentsAt, audio, installApi, installFakeAudio, json, pdfResponse, sampleAnalysis, status } from "./fixtures";

describe("severity", () => {
  it("maps risk levels and unknown strings safely", () => {
    expect(riskLevelSeverity("CRITICAL")).toBe("critical");
    expect(riskLevelSeverity("medium")).toBe("medium");
    expect(riskLevelSeverity("UNKNOWN")).toBe("info");
    expect(toSeverity("HIGH")).toBe("high");
    expect(toSeverity("<script>")).toBe("info");
    expect(toSeverity(null)).toBe("info");
  });

  it("ranks critical highest", () => {
    expect(["info", "critical", "low", "high", "medium"].map((s) => toSeverity(s)).sort((a, b) => severityRank(b) - severityRank(a)))
      .toEqual(["critical", "high", "medium", "low", "info"]);
  });
});

describe("attack surface layout", () => {
  const { nodes, edges } = sampleAnalysis().surface;
  const layout = layoutSurface(nodes, edges);
  const byId = new Map(layout.nodes.map((n) => [n.id, n]));

  it("puts the target in the centre and every node inside the canvas", () => {
    const root = byId.get("target")!;
    expect(root.x).toBe(layout.width / 2);
    expect(root.y).toBe(layout.height / 2);
    for (const n of layout.nodes) {
      expect(n.x - n.r).toBeGreaterThanOrEqual(0);
      expect(n.x + n.r).toBeLessThanOrEqual(layout.width);
      expect(n.y - n.r).toBeGreaterThanOrEqual(0);
      expect(n.y + n.r).toBeLessThanOrEqual(layout.height);
    }
  });

  it("puts services on an inner ring and their findings further out, on the same side", () => {
    const port = byId.get("port-80")!;
    const cve = byId.get("cve-CVE-2021-41773-80")!;
    const dist = (n: { x: number; y: number }) => Math.hypot(n.x - layout.width / 2, n.y - layout.height / 2);
    expect([port.ring, cve.ring]).toEqual([1, 2]);
    expect(dist(cve)).toBeGreaterThan(dist(port));
    expect(Math.abs(cve.angle - port.angle)).toBeLessThan(0.4);
  });

  it("never overlaps the first ring and keeps one edge per link", () => {
    const ring1 = layout.nodes.filter((n) => n.ring === 1);
    for (const a of ring1) for (const b of ring1) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r);
    expect(layout.edges).toHaveLength(edges.length);
    expect(new Set(layout.edges.map((e) => e.id)).size).toBe(edges.length);
  });

  it("handles an empty graph, a lone target and many services", () => {
    expect(layoutSurface([], []).nodes).toEqual([]);
    expect(layoutSurface([nodes[0]], []).nodes).toHaveLength(1);
    const many = Array.from({ length: 14 }, (_, i) => ({ ...nodes[1], id: `p${i}`, label: `P${i}` }));
    const big = layoutSurface([nodes[0], ...many], many.map((m) => ({ source: "target", target: m.id })));
    expect(big.nodes).toHaveLength(15);
    const r1 = big.nodes.filter((n) => n.ring === 1);
    for (const a of r1) for (const b of r1) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r);
  });

  it("still draws nodes that are not connected to the graph", () => {
    const l = layoutSurface([nodes[0], { ...nodes[1], id: "loose" }], []);
    expect(l.nodes.find((n) => n.id === "loose")?.ring).toBe(1);
  });
});

describe("terminal lines", () => {
  it("prints the command that was run", () => {
    expect(commandLines("k", "example.com")[0]).toMatchObject({ tone: "cmd", text: expect.stringContaining("aegis scan --target example.com") });
  });

  it("prints one line per agent that changed state, and nothing when nothing changed", () => {
    const first = status({ agents: agentsAt(0, true) });
    expect(linesForStatus(null, first, "k", 0).map((l) => l.text)).toEqual(["▶ Recon Agent: WHOIS, DNS and TLS reconnaissance"]);
    const second = status({ agents: agentsAt(1, true) });
    expect(linesForStatus(first, second, "k", 1).map((l) => l.text)).toEqual([
      "✔ Recon Agent completed", "▶ Nmap Intelligence Agent: Port discovery and service fingerprinting"]);
    expect(linesForStatus(second, second, "k", 3)).toEqual([]);
  });

  it("reports a failed agent and the failure message once", () => {
    const running = status({ agents: agentsAt(1, true) });
    const failed = status({ status: "failed", message: "Scan failed: PortScannerError", agents: AGENTS_DONE.map((a, i) => (i === 1 ? { ...a, status: "failed", progress: null } : i < 1 ? a : { ...a, status: "waiting", progress: 0 })) });
    const lines = linesForStatus(running, failed, "k", 0);
    expect(lines.map((l) => l.tone)).toEqual(["error", "error"]);
    expect(lines[1].text).toContain("PortScannerError");
    expect(linesForStatus(failed, failed, "k", 2)).toEqual([]);
  });

  it("gives every line a unique id and summarises the finished scan", () => {
    const lines = completionLines(sampleAnalysis(), "k", 10);
    expect(lines[0].text).toBe("✔ Scan complete: LOW risk, security score 82/100, 2 alerts");
    expect(lines.slice(1).map((l) => l.text)).toEqual([
      "[!] CRITICAL Exposed Telnet service detected on port 23",
      "[!] HIGH CVE-2021-41773: Apache HTTP Server path traversal / file disclosure"]);
    expect(new Set(lines.map((l) => l.id)).size).toBe(lines.length);
    expect(completionLines(sampleAnalysis({ alerts: [] }), "k", 0)[0].text).toContain("0 alerts");
  });
});

describe("simulated threat telemetry", () => {
  it("is repeatable for the same seed and different for another", () => {
    expect(simulateEvents(7, 20)).toEqual(simulateEvents(7, 20));
    expect(simulateEvents(7, 20)).not.toEqual(simulateEvents(8, 20));
    expect(simulateEvent(7, 5)).toEqual(simulateEvents(7, 6)[5]);
  });

  it("produces complete, valid events with unique ids", () => {
    const events = simulateEvents(3, 200);
    expect(new Set(events.map((e) => e.id)).size).toBe(200);
    for (const e of events) {
      expect(THREAT_REGIONS).toContain(e.region);
      expect(["low", "medium", "high", "critical"]).toContain(e.severity);
      expect(e.kind.length).toBeGreaterThan(3);
    }
    expect(new Set(events.map((e) => e.region.id)).size).toBeGreaterThan(8);   // spread across regions
  });

  it("uses illustrative regions, not countries", () => {
    for (const r of THREAT_REGIONS) expect(r.name).not.toMatch(/\b(china|russia|iran|india|usa|korea|brazil)\b/i);
  });

  it("ranks regions by event count", () => {
    const totals = regionTotals(simulateEvents(1, 80));
    expect(totals.reduce((s, t) => s + t.count, 0)).toBe(80);
    expect(totals.map((t) => t.count)).toEqual([...totals.map((t) => t.count)].sort((a, b) => b - a));
  });
});

describe("world map", () => {
  it("projects the corners and the equator/meridian onto the canvas", () => {
    expect(project(-180, 84)).toEqual([0, 0]);
    expect(project(180, 84)).toEqual([MAP_WIDTH, 0]);
    expect(project(0, 84)[0]).toBe(MAP_WIDTH / 2);
    expect(project(0, -58)[1]).toBe(MAP_HEIGHT);
  });

  it("turns the bundled world atlas into one closed path per country", () => {
    const paths = landPaths(countries);
    expect(paths.length).toBeGreaterThan(150);
    for (const d of paths) {
      expect(d.startsWith("M")).toBe(true);
      expect(d.endsWith("Z")).toBe(true);
    }
    const xs = paths.flatMap((d) => [...d.matchAll(/[ML](-?[\d.]+) /g)].map((m) => Number(m[1])));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(MAP_WIDTH);
  });
});

describe("sound", () => {
  beforeEach(() => { audio.oscillators.length = 0; installFakeAudio(); });

  it("plays the right synth pattern for each alert level", () => {
    playSound("critical");
    expect(audio.oscillators).toHaveLength(SOUND_PATTERNS.critical.length);
    expect(audio.oscillators.every((o) => o.type === "sawtooth")).toBe(true);
    audio.oscillators.length = 0;
    playSound("alert");
    expect(audio.oscillators.map((o) => o.freq)).toEqual([740, 988]);
  });

  it("critical is clearly louder and longer than a typing tick", () => {
    expect(SOUND_PATTERNS.critical.length).toBeGreaterThan(SOUND_PATTERNS.type.length);
    expect(SOUND_PATTERNS.critical[0].volume).toBeGreaterThan(SOUND_PATTERNS.type[0].volume);
  });

  it("is off by default, remembers the choice and tells subscribers", () => {
    expect(soundStore.getSnapshot()).toBe(false);
    expect(soundStore.getServerSnapshot()).toBe(false);
    const listener = vi.fn();
    const unsubscribe = soundStore.subscribe(listener);
    soundStore.set(true);
    expect(soundStore.getSnapshot()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    soundStore.set(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("api helpers", () => {
  beforeEach(() => window.localStorage.setItem("aegisai_token", "tok"));

  it("apiJson returns typed data and throws ApiError with the server's message", async () => {
    installApi({ "GET /ok": () => json(200, { a: 1 }), "GET /bad": () => json(429, { detail: "Slow down" }) });
    expect(await apiJson<{ a: number }>("/ok")).toEqual({ a: 1 });
    await expect(apiJson("/bad")).rejects.toMatchObject({ name: "ApiError", status: 429, message: "Slow down" });
    await expect(apiJson("/bad")).rejects.toBeInstanceOf(ApiError);
  });

  it("downloadReport saves a safely named PDF and reports unavailable reports", async () => {
    const saved: string[] = [];
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() }));
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { saved.push(this.download); });
    installApi({ "GET /scanner/report/:id": (c) => (c.path.endsWith("/7") ? pdfResponse() : json(404, { detail: "The report is not ready yet" })) });
    await downloadReport(7, "../../etc/passwd; rm -rf /");
    expect(saved).toEqual(["aegisai-report-.._.._etc_passwd__rm_-rf__-7.pdf"]);
    await expect(downloadReport(8, "x")).rejects.toThrow("The report is not ready yet");
  });
});

describe("agent defaults", () => {
  it("lists the five agents in pipeline order, all waiting", () => {
    expect(DEFAULT_AGENTS.map((a) => a.id)).toEqual(["recon", "nmap", "cve", "risk", "report"]);
    expect(DEFAULT_AGENTS.every((a) => a.status === "waiting")).toBe(true);
  });
});
