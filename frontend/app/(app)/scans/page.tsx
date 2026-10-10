"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import SeverityBadge from "@/components/SeverityBadge";
import { api } from "@/services/api";
import type { HistoryPage } from "@/services/types";

export default function HistoryPageView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState("");
  const [data, setData] = useState<HistoryPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.history({ page, search, risk_level: risk }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load scan history");
    }
  }, [page, search, risk]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  async function remove(id: number, target: string) {
    if (!window.confirm(`Delete the scan of ${target} and its report?`)) return;
    await api.deleteScan(id);
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Scan history</h1>
      <div className="flex flex-wrap gap-3">
        <input aria-label="Search targets" placeholder="Search by target" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded border border-line bg-surface px-3 py-2" />
        <select aria-label="Filter by risk level" value={risk} onChange={(e) => { setRisk(e.target.value); setPage(1); }}
          className="rounded border border-line bg-surface px-3 py-2">
          <option value="">All risk levels</option>
          {["Low", "Medium", "High", "Critical"].map((l) => <option key={l}>{l}</option>)}
        </select>
      </div>

      {error && <p role="alert" className="text-sm font-medium text-sev-critical">{error}</p>}

      <div className="overflow-x-auto rounded-panel border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="px-5 py-2 font-medium">Target</th><th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Risk</th><th className="px-3 py-2 font-medium">Score</th>
              <th className="px-3 py-2 font-medium">Started</th><th className="px-5 py-2" />
            </tr>
          </thead>
          <tbody>
            {data?.items.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="px-5 py-2.5"><Link href={`/scans/${s.id}`} className="font-medium text-brand hover:underline">{s.target}</Link></td>
                <td className="px-3 py-2.5 capitalize">{s.status}</td>
                <td className="px-3 py-2.5"><SeverityBadge level={s.risk_level} /></td>
                <td className="px-3 py-2.5">{s.risk_score ?? "-"}</td>
                <td className="px-3 py-2.5 text-muted">{new Date(s.created_at).toLocaleString()}</td>
                <td className="px-5 py-2.5 text-right">
                  <button onClick={() => remove(s.id, s.target)} className="text-sm text-muted hover:text-sev-critical">Delete</button>
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-6 text-center text-muted">No scans match. Clear the filters or start a new scan from the dashboard.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">{data ? `${data.total} scan${data.total === 1 ? "" : "s"}` : ""}</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border border-line bg-surface px-3 py-1.5 disabled:opacity-40">Previous</button>
          <span>Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded border border-line bg-surface px-3 py-1.5 disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
