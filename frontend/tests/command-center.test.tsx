import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { router } = vi.hoisted(() => ({ router: { replace: vi.fn(), push: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

import Home from "@/app/page";
import type { Analysis, ScanStatus, ScanSummary } from "@/lib/types";
import {
  agentsAt, AGENTS_DONE, audio, delta, done, fullStream, installApi, installFakeAudio, json, pdfResponse,
  sampleAnalysis, SAMPLE_HISTORY, type Handler,
} from "./fixtures";

const STATS = { total_scans: 3, critical_risk: 0, high_risk: 1, medium_risk: 0, low_risk: 1 };
let saved: string[];
let history: ScanSummary[];

function routes(over: Record<string, Handler> = {}): Record<string, Handler> {
  return {
    "GET /history/": () => json(200, history),
    "GET /dashboard/stats": () => json(200, STATS),
    "GET /scanner/analysis/latest": () => json(200, sampleAnalysis()),
    "GET /scanner/analysis/:id": (c) => json(200, sampleAnalysis({ scan_id: Number(c.path.split("/").pop()), target: "old.example.com" })),
    "GET /scanner/report/:id": () => pdfResponse(),
    "DELETE /history/:id": () => json(200, { message: "ok" }),
    "GET /assistant/history": () => json(200, []),
    "POST /assistant/ask/stream": () => fullStream(delta("ok"), done("ok")),
    ...over,
  };
}

beforeEach(() => {
  router.replace.mockClear();
  history = [...SAMPLE_HISTORY];
  saved = [];
  audio.oscillators.length = 0;
  installFakeAudio();
  window.localStorage.setItem("aegisai_token", "tok123");
  window.scrollTo = vi.fn();
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:report"), revokeObjectURL: vi.fn() }));
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { saved.push(this.download); });
});

const finishedStatus = (): ScanStatus => ({
  id: 9, target: "new.example.org", status: "completed", progress: 100, message: "Scan completed",
  risk: { score: 18, level: "LOW" }, agents: AGENTS_DONE,
});
const newScanAnalysis = (): Analysis => sampleAnalysis({ scan_id: 9, target: "new.example.org" });

/** The analysis has loaded (this heading does not animate, unlike the count-up numbers). */
const ready = () => screen.findByRole("heading", { name: "AegisAI Analyst Report" }, { timeout: 4000 });
const agentStatus = (name: string) => screen.getByText(name).closest("li")!.getAttribute("data-status");

async function launch(user: ReturnType<typeof userEvent.setup>, target = "new.example.org") {
  await user.type(screen.getByRole("textbox", { name: "Scan target" }), target);
  await user.click(screen.getByRole("checkbox"));
  await user.click(screen.getByRole("button", { name: "LAUNCH SCAN" }));
}

describe("loading the command center", () => {
  it("sends signed-out visitors to the login page without calling the API", async () => {
    window.localStorage.clear();
    const api = installApi(routes());
    render(<Home />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(api.calls).toHaveLength(0);
  });

  it("shows the latest analysis in every panel, straight away", async () => {
    installApi(routes());
    const { container } = render(<Home />);
    await ready();
    expect(await screen.findByText("82%", {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText("B+")).toBeInTheDocument();
    expect(screen.getByLabelText("Change since previous scan")).toHaveTextContent("+12%");
    expect(screen.getByText(/presents high business risk/)).toBeInTheDocument();
    expect(screen.getByText("2 active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Telnet 23/ })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("API ONLINE");
    expect(container.querySelectorAll('li[data-status="completed"]')).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Open Security Copilot" })).toBeInTheDocument();
  });

  it("guides a first-time user instead of showing empty charts", async () => {
    history = [];
    installApi(routes({ "GET /scanner/analysis/latest": () => json(404, { detail: "No completed scans yet" }) }));
    const { container } = render(<Home />);
    expect(await screen.findByText(/Launch a scan and the analyst will explain/)).toBeInTheDocument();
    expect(screen.getByText("No scans yet.")).toBeInTheDocument();
    expect(container.querySelectorAll('li[data-status="waiting"]')).toHaveLength(5);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says when the API cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network down"); }));
    render(<Home />);
    expect(await screen.findByText("API UNREACHABLE")).toBeInTheDocument();
  });
});

function liveScanRoutes(sequence: ScanStatus[], analysis: Analysis = newScanAnalysis()) {
  let polls = 0;
  return routes({
    "POST /scanner/start": () => json(200, { scan_id: 9, status: "started" }),
    "GET /scanner/status/:id": () => json(200, sequence[Math.min(polls++, sequence.length - 1)]),
    "GET /scanner/analysis/:id": () => json(200, analysis),
  });
}

describe("running a scan", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

  it("follows the real pipeline: agents advance, the terminal types, alerts pop up, polling stops", async () => {
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    const api = installApi(liveScanRoutes([
      { id: 9, target: "new.example.org", status: "running", progress: 15, message: "Reconnaissance", risk: null, agents: agentsAt(0, true) },
      { id: 9, target: "new.example.org", status: "running", progress: 40, message: "Scanning ports", risk: null, agents: agentsAt(1, true) },
      finishedStatus(),
    ]));
    render(<Home />);
    await ready();
    await launch(user);
    expect(api.calls.find((c) => c.path === "/scanner/start")!.body).toEqual({ target: "new.example.org", authorized: true });

    await waitFor(() => expect(agentStatus("Recon Agent")).toBe("running"));
    await tick(1500);
    await waitFor(() => expect(agentStatus("Nmap Intelligence Agent")).toBe("running"));
    expect(agentStatus("Recon Agent")).toBe("completed");
    await tick(1500);
    await waitFor(() => expect(api.count("GET", /\/scanner\/analysis\/9$/)).toBe(1));
    await waitFor(() => expect(screen.getAllByRole("alert").some((a) => /CRITICAL ALERT/.test(a.textContent ?? ""))).toBe(true));
    expect(screen.getByRole("button", { name: "LAUNCH SCAN" })).toBeEnabled();

    await tick(30000);
    const log = screen.getByRole("log");
    expect(log).toHaveTextContent("$ aegis scan --target new.example.org");
    expect(log).toHaveTextContent("✔ Nmap Intelligence Agent completed");
    expect(log).toHaveTextContent("✔ Scan complete: LOW risk, security score 82/100, 2 alerts");
    const polls = api.count("GET", /\/scanner\/status\/9$/);
    await tick(10000);
    expect(api.count("GET", /\/scanner\/status\/9$/)).toBe(polls);
  }, 40000);

  it("rings the alarm for a critical finding only when sound is on", async () => {
    window.localStorage.setItem("aegisai_sound", "on");
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    installApi(liveScanRoutes([finishedStatus()]));
    render(<Home />);
    await ready();
    audio.oscillators.length = 0;
    await launch(user);
    await waitFor(() => expect(audio.oscillators.filter((o) => o.type === "sawtooth")).toHaveLength(4));
  });

  it("shows a failed scan: the active agent fails and no analysis is requested", async () => {
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    const failedAgents = AGENTS_DONE.map((a, i) => (i === 0 ? a : i === 1 ? { ...a, status: "failed" as const, progress: null } : { ...a, status: "waiting" as const, progress: 0 }));
    const api = installApi(liveScanRoutes([{ id: 9, target: "new.example.org", status: "failed", progress: 40, message: "Scan failed: PortScannerError", risk: null, agents: failedAgents }]));
    render(<Home />);
    await ready();
    await launch(user);
    await waitFor(() => expect(agentStatus("Nmap Intelligence Agent")).toBe("failed"));
    await tick(30000);
    expect(screen.getByRole("log")).toHaveTextContent("✖ Scan failed");
    expect(api.count("GET", /\/scanner\/analysis\/9$/)).toBe(0);
    expect(screen.getByRole("button", { name: "LAUNCH SCAN" })).toBeEnabled();
  }, 40000);

  it("shows why a scan could not start, and does not poll", async () => {
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    const api = installApi(routes({ "POST /scanner/start": () => json(400, { success: false, error: { code: "TARGET_NOT_ALLOWED", message: "Scanning private, loopback or internal addresses is not allowed" } }) }));
    render(<Home />);
    await ready();
    await launch(user, "127.0.0.1");
    expect(await screen.findByText("Scanning private, loopback or internal addresses is not allowed")).toBeInTheDocument();
    await tick(30000);
    expect(screen.getByRole("log")).toHaveTextContent("✖ The scan could not be started");
    expect(api.count("GET", /\/scanner\/status\//)).toBe(0);
  }, 40000);
});

describe("report, history and Copilot actions", () => {
  it("downloads the PDF from the analyst panel, the executive summary and the history table", async () => {
    const user = userEvent.setup();
    installApi(routes());
    render(<Home />);
    await ready();
    await user.click(screen.getByRole("button", { name: /pdf report$/i }));
    await user.click(within(screen.getByRole("region", { name: "Executive security report" })).getByRole("button", { name: /pdf/i }));
    await user.click(screen.getByRole("button", { name: "Download PDF report for example.com" }));
    await waitFor(() => expect(saved).toHaveLength(3));
    expect(new Set(saved)).toEqual(new Set(["aegisai-report-example.com-12.pdf"]));
  });

  it("shows a readable error when a report is not available", async () => {
    const user = userEvent.setup();
    installApi(routes({ "GET /scanner/report/:id": () => json(404, { detail: "The report is not ready yet" }) }));
    render(<Home />);
    await ready();
    await user.click(screen.getByRole("button", { name: /pdf report$/i }));
    expect(await screen.findByText("The report is not ready yet")).toBeInTheDocument();
    expect(saved).toHaveLength(0);
  });

  it("opens an older scan from the history table", async () => {
    const user = userEvent.setup();
    history = [...SAMPLE_HISTORY, { id: 8, target: "old.example.com", status: "completed", risk: "HIGH", risk_score: 40, progress: 100, message: "", created_at: null }];
    const api = installApi(routes());
    render(<Home />);
    await ready();
    await user.click(screen.getByRole("button", { name: "View analysis of old.example.com" }));
    await waitFor(() => expect(api.count("GET", /\/scanner\/analysis\/8$/)).toBe(1));
    expect(await screen.findByText("Scan #8 · 2026-10-10 12:00:00 UTC")).toBeInTheDocument();
    expect(screen.getByText("old.example.com", { selector: "dd" })).toBeInTheDocument();
  });

  it("deletes a scan and refreshes the list", async () => {
    const user = userEvent.setup();
    const api = installApi(routes({ "DELETE /history/:id": () => { history = history.filter((s) => s.id !== 10); return json(200, { message: "ok" }); } }));
    render(<Home />);
    await screen.findByText("broken.example.org");
    await user.click(screen.getByRole("button", { name: "Delete scan of broken.example.org" }));
    await waitFor(() => expect(screen.queryByText("broken.example.org")).toBeNull());
    expect(api.calls.some((c) => c.method === "DELETE" && c.path === "/history/10")).toBe(true);
  });

  it("asks the Copilot to explain an alert, with the scan attached", async () => {
    const user = userEvent.setup();
    const api = installApi(routes());
    render(<Home />);
    await screen.findByText("2 active");
    await user.click(within(screen.getByRole("region", { name: "Threat alerts" })).getAllByRole("button", { name: /explain/i })[0]);
    expect(screen.getByRole("dialog", { name: /security copilot/i })).toBeInTheDocument();
    await waitFor(() => expect(api.count("POST", /ask\/stream$/)).toBe(1));
    const body = api.calls.find((c) => c.path === "/assistant/ask/stream")!.body!;
    expect(body.scan_id).toBe(12);
    expect(body.question).toBe("Explain this finding and why it matters: Exposed Telnet service detected on port 23");
  });

  it("the top bar toggles sound, opens the Copilot and logs out", async () => {
    const user = userEvent.setup();
    installApi(routes());
    render(<Home />);
    await ready();
    await user.click(screen.getByRole("button", { name: "Sound alerts" }));
    expect(window.localStorage.getItem("aegisai_sound")).toBe("on");
    await user.click(screen.getAllByRole("button", { name: /copilot/i })[0]);
    expect(screen.getByRole("dialog", { name: /security copilot/i })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: /log out/i }));
    expect(window.localStorage.getItem("aegisai_token")).toBeNull();
    expect(router.replace).toHaveBeenCalledWith("/login");
  });
});
