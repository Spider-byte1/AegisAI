import Link from "next/link";
import type { ScanSummary } from "@/services/types";
import SeverityBadge from "./SeverityBadge";

export default function RecentScansTable({ scans }: { scans: ScanSummary[] }) {
  if (scans.length === 0) {
    return <p className="p-5 text-sm text-muted">No scans yet. Enter a target above to run your first scan.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-muted">
          <tr>
            <th className="px-5 py-2 font-medium">Target</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Risk</th>
            <th className="px-3 py-2 font-medium">Score</th>
            <th className="px-5 py-2 font-medium">Started</th>
          </tr>
        </thead>
        <tbody>
          {scans.map((s) => (
            <tr key={s.id} className="border-t border-line">
              <td className="px-5 py-2.5">
                <Link href={`/scans/${s.id}`} className="font-medium text-brand hover:underline">
                  {s.target}
                </Link>
              </td>
              <td className="px-3 py-2.5 capitalize">{s.status === "running" ? `${s.stage.replace("_", " ")}...` : s.status}</td>
              <td className="px-3 py-2.5">
                <SeverityBadge level={s.risk_level} />
              </td>
              <td className="px-3 py-2.5">{s.risk_score ?? "-"}</td>
              <td className="px-5 py-2.5 text-muted">{new Date(s.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
