"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import RiskGauge from "@/components/RiskGauge";
import ScanProgress from "@/components/ScanProgress";
import ScanResults from "@/components/ScanResults";
import { useScan } from "@/hooks/useScan";
import { api } from "@/services/api";

export default function ScanPage() {
  const params = useParams<{ id: string }>();
  const { scan, error } = useScan(Number(params.id));
  const [dlError, setDlError] = useState<string | null>(null);

  if (error) {
    return (
      <div>
        <p role="alert" className="font-medium text-sev-critical">{error}</p>
        <Link href="/dashboard" className="text-brand hover:underline">Back to dashboard</Link>
      </div>
    );
  }
  if (!scan) return <p className="text-muted">Loading scan...</p>;

  const running = scan.status === "queued" || scan.status === "running";
  const r = scan.results;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/scans" className="text-sm text-brand hover:underline">Scan history</Link>
          <h1 className="font-display text-3xl font-bold">{scan.target}</h1>
          <p className="text-sm text-muted">Started {new Date(scan.created_at).toLocaleString()}</p>
        </div>
        {scan.report_file && (
          <div>
            <button
              onClick={() => api.downloadReport(scan.report_file!).catch((e) => setDlError(e.message))}
              className="rounded bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark"
            >
              Download PDF report
            </button>
            {dlError && <p role="alert" className="mt-1 text-sm text-sev-critical">{dlError}</p>}
          </div>
        )}
      </div>

      {(running || scan.status === "failed") && (
        <section className="rounded-panel border border-line bg-surface p-5">
          <ScanProgress stage={scan.stage} progress={scan.progress} failed={scan.status === "failed"} />
          {scan.status === "failed" && (
            <p role="alert" className="mt-4 text-sm text-sev-critical">
              The scan stopped: {scan.error || "unknown error"}. Check the target and start a new scan.
            </p>
          )}
        </section>
      )}

      {r && scan.status === "completed" && (
        <>
          <section className="grid items-center gap-6 rounded-panel border border-line bg-surface p-5 md:grid-cols-[260px_1fr]">
            <RiskGauge score={r.risk.score} level={r.risk.level} />
            <div>
              <h2 className="font-display text-lg font-semibold">Summary</h2>
              <p className="mt-1 max-w-prose">{r.executive_summary.text}</p>
              <p className="mt-2 text-xs text-muted">
                {r.executive_summary.source === "ai" ? "Written by AI from the scan data." : "Generated from the scan data."}
              </p>
            </div>
          </section>
          <ScanResults r={r} />
        </>
      )}
    </div>
  );
}
