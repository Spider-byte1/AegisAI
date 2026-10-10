"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/services/api";

export default function ScanForm() {
  const router = useRouter();
  const [target, setTarget] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const scan = await api.startScan(target, authorized);
      router.push(`/scans/${scan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the scan");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-panel border border-line bg-surface p-5">
      <label htmlFor="target" className="font-display text-lg font-semibold">
        Scan a target
      </label>
      <p className="mb-3 text-sm text-muted">Enter a domain or IP address. Try scanme.nmap.org, which Nmap provides for testing.</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="example.com or 203.0.113.10"
          required
          className="min-w-0 flex-1 rounded border border-line bg-paper px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
        <button
          disabled={busy || !authorized || !target.trim()}
          className="rounded bg-brand px-5 py-2 font-semibold text-white hover:bg-brand-dark focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Starting..." : "Start scan"}
        </button>
      </div>
      <label className="mt-3 flex items-start gap-2 text-sm">
        <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} className="mt-1" />
        <span>I own this target or have written permission to assess it.</span>
      </label>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-sev-critical">
          {error}
        </p>
      )}
    </form>
  );
}
