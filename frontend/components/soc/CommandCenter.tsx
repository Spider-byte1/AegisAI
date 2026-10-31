"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AssistantWidget from "@/components/AssistantWidget";
import AgentPipeline from "@/components/soc/AgentPipeline";
import { AlertFeed, AlertToasts, type ToastBatch } from "@/components/soc/AlertCenter";
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
import { useAnalysis } from "@/hooks/useAnalysis";
import { useCopilot } from "@/hooks/useCopilot";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useScanSession } from "@/hooks/useScanSession";
import { useSound } from "@/hooks/useSound";
import { clearToken, downloadReport, getToken } from "@/lib/api";
import { commandLines, completionLines, linesForStatus, type TerminalLine } from "@/lib/terminal";
import type { Alert } from "@/lib/types";

/** The whole SOC dashboard: owns the live scan, the terminal log, the toasts and the shown analysis. */
export default function CommandCenter() {
  const router = useRouter();
  const sound = useSound();
  const copilot = useCopilot();
  const dashboard = useDashboardData();
  const analysisState = useAnalysis();
  const { analysis } = analysisState;

  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [terminalKey, setTerminalKey] = useState("idle");
  const [toasts, setToasts] = useState<ToastBatch | null>(null);
  const [reportError, setReportError] = useState("");
  const scanKey = useRef("idle");
  const lineCount = useRef(0);
  const batchCount = useRef(0);

  const addLines = useCallback((make: (startIndex: number) => TerminalLine[]) => {
    const made = make(lineCount.current);
    lineCount.current += made.length;
    setLines((prev) => [...prev, ...made]);
  }, []);

  const session = useScanSession({
    onStatus: (previous, next) => addLines((i) => linesForStatus(previous, next, scanKey.current, i)),
    onFinished: async (status) => {
      await dashboard.refresh();
      if (status.status !== "completed") return;
      const data = await analysisState.load(status.id);
      if (!data) return;
      addLines((i) => completionLines(data, scanKey.current, i));
      if (data.alerts.length === 0) sound.play("success");
      batchCount.current += 1;
      setToasts({ key: batchCount.current, alerts: data.alerts });
    },
  });

  // Signed-out visitors go to the login page; otherwise load history, totals and the latest analysis.
  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    void dashboard.refresh();
    void analysisState.loadLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const launch = async (target: string, authorized: boolean): Promise<boolean> => {
    const key = `scan-${Date.now()}`;
    scanKey.current = key;
    lineCount.current = 0;
    setTerminalKey(key);
    setLines([]);
    setToasts(null);
    addLines((i) => commandLines(key, target, i));
    const started = await session.start(target, authorized);
    if (!started) addLines((i) => [{ id: `${key}-${i}`, tone: "error", text: "✖ The scan could not be started" }]);
    return started;
  };

  const download = useCallback(async (id: number, target: string) => {
    setReportError("");
    try {
      await downloadReport(id, target);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Could not download the report");
    }
  }, []);

  const viewScan = async (id: number) => {
    await analysisState.load(id);
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  const explainAlert = (alert: Alert) => copilot.openWith(`Explain this finding and why it matters: ${alert.title}`);
  const logout = () => {
    clearToken();
    router.replace("/login");
  };

  const agents = session.status && session.status.agents.length > 0 ? session.status.agents : (analysis?.agents ?? []);
  const downloadCurrent = () => analysis && download(analysis.scan_id, analysis.target);

  return (
    <div className="min-h-screen">
      <TopBar online={dashboard.online} onLogout={logout} onOpenCopilot={() => copilot.setOpen(true)} />

      <main className="mx-auto max-w-[1600px] space-y-6 px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <KpiStrip stats={dashboard.stats} />

        {analysisState.error && (
          <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">{analysisState.error}</p>
        )}
        {reportError && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">{reportError}</p>}

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            <ScanLauncher onLaunch={launch} busy={session.starting || session.running} error={session.error} status={session.status} />
            <div className="grid gap-6 lg:grid-cols-2">
              <AgentPipeline agents={agents} />
              <ScanTerminal lines={lines} sessionKey={terminalKey} />
            </div>
            <AnalystReport
              analysis={analysis}
              loading={analysisState.loading}
              onExplain={() => copilot.openWith("Analyze latest scan")}
              onDownload={() => void downloadCurrent()}
            />
            <AttackSurfaceMap key={analysis?.scan_id ?? "none"} surface={analysis?.surface ?? null} />
          </div>

          <div className="space-y-6 xl:col-span-4">
            <HealthGauge health={analysis?.health ?? null} />
            <ExecutiveSummary executive={analysis?.executive ?? null} onDownload={() => void downloadCurrent()} />
            <AlertFeed key={analysis?.scan_id ?? "none"} alerts={analysis?.alerts ?? []} onExplain={explainAlert} />
          </div>
        </div>

        <ThreatMap />

        <ScanHistory
          scans={dashboard.scans}
          selectedId={analysis?.scan_id ?? null}
          onSelect={(id) => void viewScan(id)}
          onDownload={(id, target) => void download(id, target)}
          onDelete={(id) => void dashboard.remove(id)}
        />
      </main>

      <AlertToasts batch={toasts} onExplain={explainAlert} />
      <AssistantWidget activeScan={analysis ? { id: analysis.scan_id, target: analysis.target } : null} />
    </div>
  );
}
