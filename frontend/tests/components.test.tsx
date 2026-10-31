import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AgentPipeline from "@/components/soc/AgentPipeline";
import { AlertFeed, AlertToasts } from "@/components/soc/AlertCenter";
import AnalystReport from "@/components/soc/AnalystReport";
import AttackSurfaceMap from "@/components/soc/AttackSurfaceMap";
import ExecutiveSummary from "@/components/soc/ExecutiveSummary";
import HealthGauge from "@/components/soc/HealthGauge";
import KpiStrip from "@/components/soc/KpiStrip";
import ScanHistory from "@/components/soc/ScanHistory";
import ScanLauncher from "@/components/soc/ScanLauncher";
import ScanTerminal from "@/components/soc/ScanTerminal";
import ThreatMap from "@/components/soc/ThreatMap";
import TopBar from "@/components/soc/TopBar";
import ProgressBar from "@/components/ui/ProgressBar";
import SeverityBadge from "@/components/ui/SeverityBadge";
import { SoundProvider } from "@/hooks/useSound";
import type { TerminalLine } from "@/lib/terminal";
import { agentsAt, audio, installFakeAudio, sampleAnalysis, SAMPLE_HISTORY, status } from "./fixtures";

const withSound = (ui: ReactElement) => <SoundProvider>{ui}</SoundProvider>;
const soundOn = () => window.localStorage.setItem("aegisai_sound", "on");

beforeEach(() => {
  audio.oscillators.length = 0;
  installFakeAudio();
});

// =============================================================== UI primitives
describe("ui primitives", () => {
  it("progress bar exposes its value, and has none while indeterminate", () => {
    const { rerender } = render(<ProgressBar label="Scan" value={42} />);
    expect(screen.getByRole("progressbar", { name: "Scan" })).toHaveAttribute("aria-valuenow", "42");
    rerender(<ProgressBar label="Scan" value={42} indeterminate />);
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
  });

  it("progress bar clamps out-of-range values", () => {
    const { container } = render(<ProgressBar label="x" value={250} />);
    expect((container.querySelector("[style]") as HTMLElement).style.width).toBe("100%");
  });

  it("severity badge shows the level, or a custom label", () => {
    const { rerender } = render(<SeverityBadge severity="critical" />);
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
    rerender(<SeverityBadge severity="low" label="Fine" />);
    expect(screen.getByText("Fine")).toBeInTheDocument();
  });
});

// =============================================================== agents
describe("AgentPipeline", () => {
  it("shows the five agents waiting before any scan", () => {
    const { container } = render(<AgentPipeline agents={[]} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(container.querySelectorAll('li[data-status="waiting"]')).toHaveLength(5);
    expect(screen.getAllByText("WAITING")).toHaveLength(5);
    expect(screen.getByText("0 of 5 agents completed")).toBeInTheDocument();
  });

  it("reflects a scan in progress: done, running (indeterminate) and waiting agents", () => {
    const { container } = render(<AgentPipeline agents={agentsAt(2, true)} />);
    expect(screen.getAllByText("COMPLETED")).toHaveLength(2);
    expect(screen.getAllByText("RUNNING")).toHaveLength(1);
    expect(screen.getAllByText("WAITING")).toHaveLength(2);
    expect(screen.getByText("CVE Intelligence Agent is working")).toBeInTheDocument();
    const running = container.querySelector('li[data-status="running"]') as HTMLElement;
    const bar = within(running).getByRole("progressbar");
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(within(container.querySelector('li[data-status="completed"]') as HTMLElement).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("marks a failed agent", () => {
    const agents = agentsAt(1, true).map((a) => (a.status === "running" ? { ...a, status: "failed" as const } : a));
    render(<AgentPipeline agents={agents} />);
    expect(screen.getByText("FAILED")).toBeInTheDocument();
  });
});

// =============================================================== terminal
describe("ScanTerminal", () => {
  const lines: TerminalLine[] = [
    { id: "a", tone: "cmd", text: "$ aegis scan" },
    { id: "b", tone: "ok", text: "ok done" },
  ];

  it("shows an idle prompt when there is nothing to print", () => {
    render(<ScanTerminal lines={[]} sessionKey="idle" />);
    expect(screen.getByText(/awaiting scan target/)).toBeInTheDocument();
  });

  it("types output one character at a time, line after line", () => {
    vi.useFakeTimers();
    render(<ScanTerminal lines={lines} sessionKey="s1" speedMs={10} />);
    const log = screen.getByRole("log");
    act(() => { vi.advanceTimersByTime(35); });
    expect(log).toHaveTextContent("$ a");
    expect(log).not.toHaveTextContent("$ aegis scan");
    act(() => { vi.advanceTimersByTime(100); });          // 12 characters at 10 ms each need 120 ms in total
    expect(log).toHaveTextContent("$ aegis scan");
    act(() => { vi.advanceTimersByTime(400); });
    expect(log).toHaveTextContent("ok done");
    expect(screen.queryByText(/awaiting/)).not.toBeInTheDocument();
  });

  it("restarts when a new scan begins, and picks up lines added while it runs", () => {
    vi.useFakeTimers();
    const { rerender } = render(<ScanTerminal lines={lines.slice(0, 1)} sessionKey="s1" speedMs={5} />);
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByRole("log")).toHaveTextContent("$ aegis scan");
    rerender(<ScanTerminal lines={lines} sessionKey="s1" speedMs={5} />);
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByRole("log")).toHaveTextContent("ok done");
    rerender(<ScanTerminal lines={[{ id: "z", tone: "info", text: "fresh scan" }]} sessionKey="s2" speedMs={5} />);
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByRole("log")).toHaveTextContent("fresh scan");
    expect(screen.getByRole("log")).not.toHaveTextContent("ok done");
  });

  it("makes key-tick sounds only when sound is switched on", () => {
    vi.useFakeTimers();
    const quiet = render(withSound(<ScanTerminal lines={lines} sessionKey="q" speedMs={5} />));
    act(() => { vi.advanceTimersByTime(300); });
    expect(audio.oscillators).toHaveLength(0);
    quiet.unmount();

    soundOn();
    render(withSound(<ScanTerminal lines={lines} sessionKey="loud" speedMs={5} />));
    act(() => { vi.advanceTimersByTime(300); });
    expect(audio.oscillators.length).toBeGreaterThan(3);
    expect(audio.oscillators.every((o) => o.type === "square")).toBe(true);
  });
});

// =============================================================== health, KPIs, executive
describe("HealthGauge", () => {
  it("shows score, grade, previous scan and improvement", async () => {
    render(<HealthGauge health={sampleAnalysis().health} />);
    expect(await screen.findByText("82%", {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText("B+")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(screen.getByLabelText("Change since previous scan")).toHaveTextContent("+12%");
    expect(screen.getByRole("img")).toHaveAccessibleName("Security health 82 percent, grade B+");
  });

  it("shows a decline, a first scan and the empty state", () => {
    const base = sampleAnalysis().health;
    const { rerender } = render(<HealthGauge health={{ ...base, delta: -8, previous_score: 90 }} />);
    expect(screen.getByLabelText("Change since previous scan")).toHaveTextContent("-8%");
    rerender(<HealthGauge health={{ ...base, delta: null, previous_score: null }} />);
    expect(screen.getByText(/First scan of this target/)).toBeInTheDocument();
    rerender(<HealthGauge health={null} />);
    expect(screen.getByText(/Run a scan to measure/)).toBeInTheDocument();
  });
});

describe("KpiStrip", () => {
  it("counts up to the real totals", async () => {
    render(<KpiStrip stats={{ total_scans: 14, critical_risk: 1, high_risk: 3, medium_risk: 4, low_risk: 7 }} />);
    await waitFor(() => expect(screen.getByLabelText("Total scans: 14")).toHaveTextContent("14"), { timeout: 4000 });   // the number animates up from 0
    await waitFor(() => expect(screen.getByLabelText("High and critical: 3")).toHaveTextContent("3"), { timeout: 4000 });
    await waitFor(() => expect(screen.getByLabelText("Low risk: 7")).toHaveTextContent("7"), { timeout: 4000 });
  });

  it("renders zeros before data arrives", () => {
    render(<KpiStrip stats={null} />);
    expect(screen.getByLabelText("Total scans: 0")).toBeInTheDocument();
  });
});

describe("ExecutiveSummary", () => {
  it("gives a manager the four numbers and a plain statement", () => {
    const onDownload = vi.fn();
    render(<ExecutiveSummary executive={sampleAnalysis().executive} onDownload={onDownload} />);
    expect(screen.getByText("Business risk")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    for (const label of ["Technical findings", "Critical issues", "Recommended actions"]) expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(/presents high business risk/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /pdf/i }));
    expect(onDownload).toHaveBeenCalled();
  });

  it("is empty until there is a scan", () => {
    render(<ExecutiveSummary executive={null} onDownload={vi.fn()} />);
    expect(screen.getByText(/appears after your first scan/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

// =============================================================== analyst report
describe("AnalystReport", () => {
  it("explains the scan: target, score, risk, findings and recommendations", () => {
    render(<AnalystReport analysis={sampleAnalysis()} loading={false} onExplain={vi.fn()} onDownload={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "AegisAI Analyst Report" })).toBeInTheDocument();
    expect(screen.getAllByText("example.com").length).toBeGreaterThan(0);
    expect(screen.getByText("82/100")).toBeInTheDocument();
    expect(screen.getByText("Exposed Telnet service detected on port 23")).toBeInTheDocument();
    expect(screen.getByText("Telnet is unencrypted. Disable it and use SSH instead.", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("IMMEDIATE")).toBeInTheDocument();
  });

  it("folds long finding lists and unfolds them on request", async () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ id: `f${i}`, severity: "low" as const, title: `Finding ${i}`, detail: "d", port: i, action: null }));
    const analysis = sampleAnalysis();
    analysis.analyst.findings = many;
    render(<AnalystReport analysis={analysis} loading={false} onExplain={vi.fn()} onDownload={vi.fn()} />);
    expect(screen.queryByText("Finding 8")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Show all 9 findings" }));
    expect(screen.getByText("Finding 8")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show fewer" }));
    expect(screen.queryByText("Finding 8")).toBeNull();
  });

  it("wires the Copilot and PDF buttons", async () => {
    const onExplain = vi.fn();
    const onDownload = vi.fn();
    render(<AnalystReport analysis={sampleAnalysis()} loading={false} onExplain={onExplain} onDownload={onDownload} />);
    await userEvent.click(screen.getByRole("button", { name: /ask copilot/i }));
    await userEvent.click(screen.getByRole("button", { name: /pdf report/i }));
    expect(onExplain).toHaveBeenCalledTimes(1);
    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it("explains the empty and loading states", () => {
    const { rerender } = render(<AnalystReport analysis={null} loading={false} onExplain={vi.fn()} onDownload={vi.fn()} />);
    expect(screen.getByText(/Launch a scan and the analyst will explain/)).toBeInTheDocument();
    rerender(<AnalystReport analysis={null} loading onExplain={vi.fn()} onDownload={vi.fn()} />);
    expect(screen.getByText(/Loading the latest analysis/)).toBeInTheDocument();
  });

  it("says when no actions are needed", () => {
    const analysis = sampleAnalysis();
    analysis.analyst.recommendations = [];
    render(<AnalystReport analysis={analysis} loading={false} onExplain={vi.fn()} onDownload={vi.fn()} />);
    expect(screen.getByText("No actions required.")).toBeInTheDocument();
  });
});

// =============================================================== alerts
describe("AlertFeed", () => {
  const alerts = sampleAnalysis().alerts;

  it("lists each alert with severity, risk score and the recommended action", () => {
    render(<AlertFeed alerts={alerts} onExplain={vi.fn()} />);
    expect(screen.getByText("2 active")).toBeInTheDocument();
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
    expect(screen.getByText("90/100")).toBeInTheDocument();
    expect(screen.getByText(/Upgrade or patch Apache httpd immediately/)).toBeInTheDocument();
  });

  it("explains an alert, and acknowledging removes it", async () => {
    const onExplain = vi.fn();
    render(<AlertFeed alerts={alerts} onExplain={onExplain} />);
    await userEvent.click(screen.getAllByRole("button", { name: /explain/i })[1]);
    expect(onExplain).toHaveBeenCalledWith(alerts[1]);
    await userEvent.click(screen.getAllByRole("button", { name: "Acknowledge" })[0]);
    expect(screen.getByText("1 active")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Acknowledge" }));
    expect(screen.getByText("All alerts acknowledged.")).toBeInTheDocument();
  });

  it("explains an empty feed", () => {
    render(<AlertFeed alerts={[]} onExplain={vi.fn()} />);
    expect(screen.getByText(/No alerts\. Alerts appear/)).toBeInTheDocument();
  });
});

describe("AlertToasts", () => {
  const batch = (alerts = sampleAnalysis().alerts, key = 1) => ({ key, alerts });

  it("pops up critical and high alerts only, in colour, with the action", () => {
    const medium = { ...sampleAnalysis().alerts[1], id: "m", severity: "medium" as const, title: "A medium thing" };
    render(<AlertToasts batch={batch([...sampleAnalysis().alerts, medium])} onExplain={vi.fn()} />);
    const toasts = screen.getAllByRole("alert");
    expect(toasts).toHaveLength(2);
    expect(toasts[0]).toHaveTextContent("CRITICAL ALERT");
    expect(toasts[1]).toHaveTextContent("HIGH RISK ALERT");
    expect(toasts[0]).toHaveTextContent("Risk score 90/100");
    expect(screen.queryByText("A medium thing")).toBeNull();
  });

  it("shows nothing for an empty batch, no batch, or low-severity alerts", () => {
    const { rerender } = render(<AlertToasts batch={null} onExplain={vi.fn()} />);
    expect(screen.queryByRole("alert")).toBeNull();
    rerender(<AlertToasts batch={batch([])} onExplain={vi.fn()} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("can be dismissed one by one", async () => {
    render(<AlertToasts batch={batch()} onExplain={vi.fn()} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Dismiss alert" })[0]);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("high alerts fade out by themselves, critical ones wait for a person", async () => {
    render(<AlertToasts batch={batch()} onExplain={vi.fn()} autoHideMs={40} />);
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1));
    expect(screen.getByRole("alert")).toHaveTextContent("CRITICAL ALERT");
  });

  it("a new batch shows fresh toasts even if the old ones were dismissed", async () => {
    const { rerender } = render(<AlertToasts batch={batch(undefined, 1)} onExplain={vi.fn()} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Dismiss alert" })[0]);
    await userEvent.click(screen.getByRole("button", { name: "Dismiss alert" }));
    expect(screen.queryByRole("alert")).toBeNull();
    rerender(<AlertToasts batch={batch(undefined, 2)} onExplain={vi.fn()} />);
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });

  it("sounds the alarm for critical, a chirp for high, and nothing when sound is off", () => {
    const silent = render(withSound(<AlertToasts batch={batch()} onExplain={vi.fn()} />));
    expect(audio.oscillators).toHaveLength(0);                                     // off by default
    silent.unmount();

    soundOn();
    const loud = render(withSound(<AlertToasts batch={batch(undefined, 5)} onExplain={vi.fn()} />));
    expect(audio.oscillators).toHaveLength(4);                                     // critical: four-note alarm
    expect(audio.oscillators.every((o) => o.type === "sawtooth")).toBe(true);
    loud.unmount();

    audio.oscillators.length = 0;
    render(withSound(<AlertToasts batch={batch([sampleAnalysis().alerts[1]], 6)} onExplain={vi.fn()} />));
    expect(audio.oscillators.map((o) => o.freq)).toEqual([740, 988]);              // high: two-tone chirp
  });

  it("asks the Copilot to explain an alert", async () => {
    const onExplain = vi.fn();
    render(<AlertToasts batch={batch()} onExplain={onExplain} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Explain with Copilot" })[0]);
    expect(onExplain).toHaveBeenCalledWith(expect.objectContaining({ id: "port:23" }));
  });
});

// =============================================================== attack surface map
describe("AttackSurfaceMap", () => {
  const surface = sampleAnalysis().surface;

  it("draws every discovered node as an accessible, focusable button", () => {
    render(<AttackSurfaceMap surface={surface} />);
    expect(screen.getByText("3 exposed services discovered")).toBeInTheDocument();
    for (const label of ["example.com", "SSH 22", "Telnet 23", "HTTP 80", "CVE-2021-41773"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${label}`) })).toHaveAttribute("tabindex", "0");
    }
    expect(screen.getAllByText("ENTRY POINT")).toHaveLength(2);       // SSH and Telnet (the CVE and DNS nodes are not services)
    expect(screen.getByText("WEB ATTACK")).toBeInTheDocument();
  });

  it("shows what a node exposes when it is clicked, and its linked findings", async () => {
    render(<AttackSurfaceMap surface={surface} />);
    expect(screen.getByText(/Select a node to see what it exposes/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^HTTP 80/ }));
    expect(screen.getByText("Web attack surface: application and server flaws")).toBeInTheDocument();
    expect(screen.getByText("Apache httpd 2.4.49")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "CVE-2021-41773" }));      // linked finding in the inspector
    expect(screen.getByText("Known vulnerability")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(screen.getByText(/Select a node/)).toBeInTheDocument();
  });

  it("works from the keyboard", async () => {
    render(<AttackSurfaceMap surface={surface} />);
    screen.getByRole("button", { name: /^Telnet 23/ }).focus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByText(/Possible entry point: remote administration/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Telnet 23/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("zooms in and out within limits", async () => {
    const { container } = render(<AttackSurfaceMap surface={surface} />);
    const zoomOf = () => container.querySelector("svg > g[transform]")!.getAttribute("transform")!.match(/scale\(([\d.]+)\)/)![1];
    expect(zoomOf()).toBe("1");
    await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(zoomOf()).toBe("1.2");
    for (let i = 0; i < 6; i++) await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(zoomOf()).toBe("1.8");
    for (let i = 0; i < 9; i++) await userEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(zoomOf()).toBe("0.8");
  });

  it("explains itself when there is nothing to draw", () => {
    render(<AttackSurfaceMap surface={null} />);
    expect(screen.getByText(/Launch a scan to see the exposed services/)).toBeInTheDocument();
  });
});

// =============================================================== threat map (simulated)
describe("ThreatMap", () => {
  it("is clearly labelled as simulated and is off until switched on", () => {
    render(<ThreatMap />);
    expect(screen.getByRole("note")).toHaveTextContent("SIMULATED TELEMETRY");
    expect(screen.getByRole("note")).toHaveTextContent("does not collect real global attack data");
    expect(screen.getByRole("switch", { name: "Show simulated threat map" })).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("img", { name: /threat map/i })).toBeNull();
  });

  it("draws the world, suspicious regions and a live feed once switched on, and stays labelled", async () => {
    render(<ThreatMap tickMs={30} />);
    await userEvent.click(screen.getByRole("switch", { name: "Show simulated threat map" }));
    const map = await screen.findByRole("img", { name: "Simulated global threat map" });
    await waitFor(() => expect(map.querySelectorAll("path").length).toBeGreaterThan(150));    // countries + arcs
    expect(screen.getByText("Suspicious regions (simulated)")).toBeInTheDocument();
    expect(screen.getByText("Live activity (simulated)")).toBeInTheDocument();
    expect(screen.getByText(/Primary data centre \(simulated\)/)).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("SIMULATED TELEMETRY");
  });

  it("keeps generating events while on, and stops when switched off", async () => {
    render(<ThreatMap tickMs={25} />);
    await userEvent.click(screen.getByRole("switch", { name: "Show simulated threat map" }));
    const feed = () => screen.getByText("Live activity (simulated)").parentElement!.querySelector("li")!.textContent;
    const first = feed();
    await waitFor(() => expect(feed()).not.toBe(first));
    await userEvent.click(screen.getByRole("switch", { name: "Show simulated threat map" }));
    expect(screen.queryByText("Live activity (simulated)")).toBeNull();
    expect(screen.getByRole("switch", { name: "Show simulated threat map" })).toHaveAttribute("aria-checked", "false");
  });
});

// =============================================================== history
describe("ScanHistory", () => {
  const handlers = () => ({ onSelect: vi.fn(), onDownload: vi.fn(), onDelete: vi.fn() });

  it("offers View and PDF only for completed scans", () => {
    render(<ScanHistory scans={SAMPLE_HISTORY} selectedId={12} {...handlers()} />);
    expect(screen.getAllByRole("button", { name: /^Download PDF report/ })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /^View analysis/ })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /^Delete scan/ })).toHaveLength(3);
    expect(screen.getByText("example.com").closest("tr")).toHaveAttribute("data-selected", "true");
  });

  it("routes the three actions with the right scan", async () => {
    const h = handlers();
    render(<ScanHistory scans={SAMPLE_HISTORY} selectedId={null} {...h} />);
    await userEvent.click(screen.getByRole("button", { name: "View analysis of example.com" }));
    await userEvent.click(screen.getByRole("button", { name: "Download PDF report for example.com" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete scan of broken.example.org" }));
    expect(h.onSelect).toHaveBeenCalledWith(12);
    expect(h.onDownload).toHaveBeenCalledWith(12, "example.com");
    expect(h.onDelete).toHaveBeenCalledWith(10);
  });

  it("shows risk badges and scores, dashes for unfinished scans, and the empty state", () => {
    const { rerender } = render(<ScanHistory scans={SAMPLE_HISTORY} selectedId={null} {...handlers()} />);
    expect(screen.getByText("LOW")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(4);
    rerender(<ScanHistory scans={[]} selectedId={null} {...handlers()} />);
    expect(screen.getByText("No scans yet.")).toBeInTheDocument();
  });
});

// =============================================================== top bar & launcher
describe("TopBar", () => {
  it("shows API state and routes the three buttons", async () => {
    const onLogout = vi.fn();
    const onOpenCopilot = vi.fn();
    const { rerender } = render(withSound(<TopBar online={null} onLogout={onLogout} onOpenCopilot={onOpenCopilot} />));
    expect(screen.getByRole("status")).toHaveTextContent("CONNECTING");
    rerender(withSound(<TopBar online onLogout={onLogout} onOpenCopilot={onOpenCopilot} />));
    expect(screen.getByRole("status")).toHaveTextContent("API ONLINE");
    rerender(withSound(<TopBar online={false} onLogout={onLogout} onOpenCopilot={onOpenCopilot} />));
    expect(screen.getByRole("status")).toHaveTextContent("API UNREACHABLE");
    await userEvent.click(screen.getByRole("button", { name: /copilot/i }));
    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    expect(onOpenCopilot).toHaveBeenCalled();
    expect(onLogout).toHaveBeenCalled();
  });

  it("runs a live UTC clock", () => {
    vi.useFakeTimers({ now: new Date("2026-10-10T12:34:56Z") });
    render(withSound(<TopBar online onLogout={vi.fn()} onOpenCopilot={vi.fn()} />));
    expect(screen.getByLabelText("Current time in UTC")).toHaveTextContent("--:--:-- UTC");
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByLabelText("Current time in UTC")).toHaveTextContent("12:34:57 UTC");
  });

  it("sound is off by default; the toggle turns it on, plays a confirmation blip and remembers", async () => {
    render(withSound(<TopBar online onLogout={vi.fn()} onOpenCopilot={vi.fn()} />));
    const toggle = screen.getByRole("button", { name: "Sound alerts" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem("aegisai_sound")).toBe("on");
    expect(audio.oscillators).toHaveLength(1);
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(audio.oscillators).toHaveLength(1);                               // turning it off is silent
  });
});

describe("ScanLauncher", () => {
  it("needs a target and the authorisation tick before it will launch", async () => {
    const onLaunch = vi.fn().mockResolvedValue(true);
    render(<ScanLauncher onLaunch={onLaunch} busy={false} error={null} />);
    const button = screen.getByRole("button", { name: "LAUNCH SCAN" });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByRole("textbox", { name: "Scan target" }), "  example.com ");
    expect(button).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox"));
    expect(button).toBeEnabled();
    await userEvent.click(button);
    expect(onLaunch).toHaveBeenCalledWith("example.com", true);              // trimmed
  });

  it("submits with Enter, and blocks launching while busy", async () => {
    const onLaunch = vi.fn().mockResolvedValue(true);
    const { rerender } = render(<ScanLauncher onLaunch={onLaunch} busy={false} error={null} />);
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.type(screen.getByRole("textbox", { name: "Scan target" }), "10.0.0.5{Enter}");
    expect(onLaunch).toHaveBeenCalledTimes(1);
    rerender(<ScanLauncher onLaunch={onLaunch} busy error={null} />);
    expect(screen.getByRole("button", { name: "SCANNING..." })).toBeDisabled();
  });

  it("shows errors and live scan progress", () => {
    const running = status({ status: "running", progress: 35, message: "Scanning ports and services" });
    render(<ScanLauncher onLaunch={vi.fn()} busy error="Domain could not be resolved" status={running} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Domain could not be resolved");
    expect(screen.getByRole("progressbar", { name: "Scan progress" })).toHaveAttribute("aria-valuenow", "35");
    expect(screen.getByText("new.example.org: Scanning ports and services")).toBeInTheDocument();
  });

  it("hides the progress bar once the scan is over", () => {
    render(<ScanLauncher onLaunch={vi.fn()} busy={false} error={null} status={status({ status: "completed", progress: 100 })} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
