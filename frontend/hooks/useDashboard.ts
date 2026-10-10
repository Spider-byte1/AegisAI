"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import type { Dashboard } from "@/services/types";

export function useDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.dashboard());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the dashboard");
    }
  }, []);

  useEffect(() => {
    load();
    // keep the numbers fresh while scans are running
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  return { data, error, reload: load };
}
