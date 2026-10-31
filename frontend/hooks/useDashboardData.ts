"use client";

import { useCallback, useState } from "react";
import { apiFetch, apiJson } from "@/lib/api";
import type { DashboardStats, ScanSummary } from "@/lib/types";

/** Scan history and totals. `online` is false when the API cannot be reached. */
export function useDashboardData() {
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [history, totals] = await Promise.all([
        apiJson<ScanSummary[]>("/history/"),
        apiJson<DashboardStats>("/dashboard/stats"),
      ]);
      setScans(Array.isArray(history) ? history : []);
      setStats(totals);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, []);

  const remove = useCallback(
    async (id: number): Promise<boolean> => {
      const res = await apiFetch(`/history/${id}`, { method: "DELETE" });
      if (res.ok) await refresh();
      return res.ok;
    },
    [refresh]
  );

  return { scans, stats, online, refresh, remove };
}
