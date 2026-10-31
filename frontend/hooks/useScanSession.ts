"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiJson } from "@/lib/api";
import type { ScanStatus } from "@/lib/types";

const POLL_MS = 1500;

interface Options {
  /** Called for every status update, with the previous one (null for the first). */
  onStatus?: (previous: ScanStatus | null, next: ScanStatus) => void;
  onFinished?: (status: ScanStatus) => void;
}

/** Starts a scan and follows its real progress by polling the API until it completes or fails. */
export function useScanSession(options: Options = {}) {
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const previous = useRef<ScanStatus | null>(null);
  const callbacks = useRef(options);
  useEffect(() => {
    callbacks.current = options;
  });

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => stop, [stop]); // stop polling when the page is left

  const follow = useCallback(
    (scanId: number) => {
      stop();
      previous.current = null;
      const tick = async () => {
        try {
          const next = await apiJson<ScanStatus>(`/scanner/status/${scanId}`);
          const before = previous.current;
          previous.current = next;
          setStatus(next);
          callbacks.current.onStatus?.(before, next);
          if (next.status === "completed" || next.status === "failed") {
            stop();
            callbacks.current.onFinished?.(next);
          }
        } catch (err) {
          stop();
          setError(err instanceof Error ? err.message : "Lost the connection to the API");
        }
      };
      void tick();
      timer.current = setInterval(tick, POLL_MS);
    },
    [stop]
  );

  const start = useCallback(
    async (target: string, authorized: boolean): Promise<boolean> => {
      setError(null);
      setStarting(true);
      try {
        const body = await apiJson<{ scan_id: number }>("/scanner/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target, authorized }),
        });
        setStatus({ id: body.scan_id, target, status: "queued", progress: 0, message: "Scan queued", risk: null, agents: [] });
        follow(body.scan_id);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "The scan could not be started");
        return false;
      } finally {
        setStarting(false);
      }
    },
    [follow]
  );

  const running = status?.status === "queued" || status?.status === "running";
  return { status, starting, running, error, start };
}
