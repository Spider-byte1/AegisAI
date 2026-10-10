"use client";
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import type { ScanDetail } from "@/services/types";

/** Loads a scan and polls every 2s until it finishes or fails. */
export function useScan(id: number) {
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const s = await api.scan(id);
        if (cancelled) return;
        setScan(s);
        if (s.status === "queued" || s.status === "running") timer = setTimeout(tick, 2000);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load this scan");
      }
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  return { scan, error };
}
