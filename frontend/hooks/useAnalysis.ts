"use client";

import { useCallback, useState } from "react";
import { ApiError, apiJson } from "@/lib/api";
import type { Analysis } from "@/lib/types";

/** The SOC analysis (analyst report, health, alerts, attack surface) of one completed scan. */
export function useAnalysis() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** The newest completed scan. "No scans yet" (404) is a normal state, not an error. */
  const loadLatest = useCallback(async (): Promise<Analysis | null> => {
    try {
      const data = await apiJson<Analysis>("/scanner/analysis/latest");
      setAnalysis(data);
      setError(null);
      return data;
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) setError(err instanceof Error ? err.message : "Could not load the analysis");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const load = useCallback(async (scanId: number): Promise<Analysis | null> => {
    setLoading(true);
    try {
      const data = await apiJson<Analysis>(`/scanner/analysis/${scanId}`);
      setAnalysis(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the analysis");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { analysis, loading, error, load, loadLatest };
}
