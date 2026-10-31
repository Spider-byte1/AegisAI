"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Sparkles, X } from "lucide-react";
import Markdown from "@/components/Markdown";
import { useCopilot } from "@/hooks/useCopilot";
import { apiFetch, errorMessage } from "@/lib/api";
import type { ActiveScan } from "@/lib/types";

type Mode = "llm" | "retrieval_only" | "no_context" | "analyst";

interface Source {
  id: number;
  title: string;
  section: string;
  excerpt: string;
  cited: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: Mode;
  notice?: string | null;
  sources?: Source[];
  error?: boolean;
  streaming?: boolean;
  stopped?: boolean;
}

interface HistoryRow {
  id: number;
  question: string;
  answer: string;
  mode: Mode;
  sources: Source[];
}

// One JSON object per line from POST /assistant/ask/stream
type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; answer: string; mode: Mode; sources: Source[]; notice?: string | null }
  | { type: "error"; message: string };

const SCAN_ACTIONS = ["Analyze latest scan", "Explain this vulnerability", "How can I fix this issue?"];
const GENERAL_EXAMPLES = [
  "Explain how a SOC analyst triages an alert",
  "What is the difference between SPF, DKIM and DMARC?",
  "How does a SQL injection work and how do I prevent it?",
  "Write a short checklist to harden an SSH server",
];

const MODE_LABEL: Partial<Record<Mode, string>> = { analyst: "ANALYST BRIEF", retrieval_only: "KNOWLEDGE BASE" };
const MAX_QUESTION = 1000;
const HISTORY_TURNS = 10;

/** Security Copilot: a SOC-analyst-style chat that can be pointed at a scan. */
export default function AssistantWidget({ activeScan = null }: { activeScan?: ActiveScan | null }) {
  const { isOpen: open, setOpen, pending, consumePending } = useCopilot();
  const [wide, setWide] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [detachedScanId, setDetachedScanId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const historyLoaded = useRef(false);

  const attached = activeScan && detachedScanId !== activeScan.id ? activeScan : null;

  // Load the earlier conversation the first time the window is opened.
  useEffect(() => {
    if (!open || historyLoaded.current) return;
    historyLoaded.current = true;
    (async () => {
      const res = await apiFetch("/assistant/history?limit=20");
      if (!res.ok) {
        historyLoaded.current = false;
        return;
      }
      const rows: HistoryRow[] = await res.json();
      setMessages((prev) =>
        prev.length > 0
          ? prev
          : rows.flatMap((r) => [
              { id: `q${r.id}`, role: "user" as const, content: r.question },
              { id: `a${r.id}`, role: "assistant" as const, content: r.answer, mode: r.mode, sources: r.sources },
            ])
      );
    })().catch(() => {
      historyLoaded.current = false;
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: busy ? "auto" : "smooth" });
  }, [messages, busy, open]);

  const ask = async (text: string) => {
    const question = text.trim();
    if (question.length < 3 || busy) return;

    const history = messages
      .filter((m) => !m.error && m.content)
      .slice(-HISTORY_TURNS)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

    const stamp = Date.now();
    const answerId = `a${stamp}`;
    setMessages((prev) => [
      ...prev,
      { id: `u${stamp}`, role: "user", content: question },
      { id: answerId, role: "assistant", content: "", streaming: true },
    ]);
    setInput("");
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const patch = (fn: (m: Message) => Message) => setMessages((prev) => prev.map((m) => (m.id === answerId ? fn(m) : m)));

    const handle = (event: StreamEvent) => {
      if (event.type === "delta") patch((m) => ({ ...m, content: m.content + event.text }));
      else if (event.type === "done") patch((m) => ({ ...m, content: event.answer, mode: event.mode, sources: event.sources, notice: event.notice, streaming: false }));
      else if (event.type === "error") throw new Error(event.message);
    };

    try {
      const res = await apiFetch("/assistant/ask/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history, ...(attached ? { scan_id: attached.id } : {}) }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null);
        throw new Error(errorMessage(data, "The Copilot could not answer"));
      }
      if (!res.body) throw new Error("The Copilot sent an empty response");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline: number;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (line) handle(JSON.parse(line) as StreamEvent);
        }
      }
    } catch (err) {
      if (controller.signal.aborted) {
        patch((m) => ({ ...m, streaming: false, stopped: true }));
      } else {
        const message = err instanceof Error ? err.message : "Something went wrong";
        patch((m) => (m.content ? { ...m, streaming: false, notice: message } : { ...m, streaming: false, error: true, content: message }));
      }
    } finally {
      abortRef.current = null;
      patch((m) => ({ ...m, streaming: false }));
      setBusy(false);
    }
  };

  // Questions sent from other panels ("Explain this finding"): run once the window is open and idle.
  const askRef = useRef(ask);
  useEffect(() => {
    askRef.current = ask;
  });
  useEffect(() => {
    if (!pending || !open || busy) return;
    consumePending(pending.id);
    void askRef.current(pending.question);
  }, [pending, open, busy, consumePending]);

  const newChat = async () => {
    abortRef.current?.abort();
    const res = await apiFetch("/assistant/history", { method: "DELETE" });
    if (res.ok) setMessages([]);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Security Copilot"
        aria-expanded={false}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-emerald-300/50 bg-[#06121a]/90 px-5 py-3 font-semibold text-emerald-200 shadow-[0_0_28px_rgba(57,255,136,0.30)] backdrop-blur transition hover:shadow-[0_0_38px_rgba(57,255,136,0.5)]"
      >
        <Sparkles size={18} aria-hidden="true" />
        Security Copilot
      </button>
    );
  }

  const size = wide ? "sm:w-[720px] sm:h-[calc(100vh-3rem)]" : "sm:w-[440px] sm:h-[680px] sm:max-h-[calc(100vh-3rem)]";
  const chips = attached ? SCAN_ACTIONS : GENERAL_EXAMPLES;

  return (
    <section
      role="dialog"
      aria-label="Security Copilot"
      className={`glass-strong fixed bottom-6 right-6 z-50 flex h-[calc(100vh-3rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-emerald-400/30 text-white shadow-[0_0_50px_rgba(0,0,0,0.6)] ${size}`}
    >
      <header className="flex items-center justify-between border-b border-white/5 bg-black/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-400/40 bg-emerald-400/10 text-emerald-300"><Sparkles size={16} aria-hidden="true" /></span>
          <div>
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Security Copilot</h2>
            <p className="text-xs text-slate-400">SOC analyst assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {messages.length > 0 && <button onClick={newChat} className="text-xs text-slate-400 underline hover:text-white">New chat</button>}
          <button onClick={() => setWide((w) => !w)} aria-label={wide ? "Shrink window" : "Expand window"} className="hidden rounded p-1 text-slate-400 hover:bg-white/5 hover:text-white sm:block">
            {wide ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
          </button>
          <button onClick={() => setOpen(false)} aria-label="Close Security Copilot" className="rounded p-1 text-slate-400 hover:bg-white/5 hover:text-white"><X size={18} aria-hidden="true" /></button>
        </div>
      </header>

      {attached && (
        <div className="flex items-center justify-between gap-2 border-b border-emerald-400/15 bg-emerald-400/5 px-4 py-2 text-xs">
          <span className="min-w-0 truncate text-emerald-200">Scan context: <span className="font-mono">{attached.target}</span> · #{attached.id}</span>
          <button onClick={() => setDetachedScanId(attached.id)} aria-label="Remove scan context" className="shrink-0 text-slate-400 hover:text-white"><X size={14} aria-hidden="true" /></button>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <div>
            <p className="mb-3 text-sm text-slate-300">
              {attached ? `I can see the results of your scan of ${attached.target}. Ask me to analyze it, explain a finding or tell you how to fix it.` : "Hi! Ask me about threats, tools, logs, SOC work or interview prep. Run a scan and I can analyze it too."}
            </p>
            <div className="flex flex-col gap-2">
              {chips.map((q) => (
                <button key={q} onClick={() => ask(q)} disabled={busy} className="rounded-lg border border-emerald-400/20 bg-black/30 px-3 py-2 text-left text-sm text-slate-200 hover:border-emerald-400/50 hover:bg-emerald-400/5">{q}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={m.role === "user" ? "max-w-[85%] rounded-2xl rounded-br-sm border border-cyan-400/30 bg-cyan-500/15 px-3 py-2 text-sm" : `min-w-0 max-w-[95%] rounded-2xl rounded-bl-sm px-3 py-2 text-sm ${m.error ? "border border-red-800 bg-red-950" : "border border-white/5 bg-black/35"}`}>
              {m.mode && MODE_LABEL[m.mode] && <p className="mb-1 font-mono text-[10px] tracking-[0.2em] text-emerald-300">{MODE_LABEL[m.mode]}</p>}
              {m.notice && <p className="mb-2 text-xs text-yellow-400">{m.notice}</p>}
              {m.role === "user" || m.error ? (
                <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
              ) : m.content ? (
                <div className="break-words">
                  <Markdown>{m.content}</Markdown>
                  {m.streaming && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-emerald-300 align-middle" aria-hidden="true" />}
                </div>
              ) : (
                <p className="animate-pulse text-slate-400">Analyzing...</p>
              )}
              {m.stopped && <p className="mt-1 text-xs text-slate-500">Stopped</p>}
              {m.sources && m.sources.length > 0 && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-cyan-300">Sources ({m.sources.length})</summary>
                  <ul className="mt-2 space-y-2">
                    {[...m.sources].sort((a, b) => Number(b.cited) - Number(a.cited)).map((s) => (
                      <li key={s.id} className="rounded-lg bg-white/5 p-2">
                        <p className="font-semibold">[{s.id}] {s.title} &mdash; {s.section}{s.cited && <span className="ml-2 text-emerald-300">cited</span>}</p>
                        <p className="mt-1 text-slate-400">{s.excerpt}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <footer className="border-t border-white/5 bg-black/30 p-3">
        <div className="flex items-end gap-2">
          <textarea
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_QUESTION))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(input);
              }
            }}
            rows={2}
            aria-label="Your question"
            placeholder={attached ? "Ask about this scan..." : "Message the Security Copilot..."}
            className="flex-1 resize-none rounded-lg border border-emerald-400/30 bg-black/50 p-2 text-sm outline-none focus:border-emerald-300"
          />
          {busy ? (
            <button onClick={() => abortRef.current?.abort()} className="rounded-lg border border-red-700 bg-red-900/60 px-4 py-2 text-sm hover:bg-red-800">Stop</button>
          ) : (
            <button onClick={() => void ask(input)} disabled={input.trim().length < 3} className="rounded-lg border border-emerald-300/50 bg-emerald-400/15 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-400/25 disabled:cursor-not-allowed disabled:opacity-40">Ask</button>
          )}
        </div>
        <p className="mt-1 text-[11px] text-slate-500">Enter to send, Shift+Enter for a new line · Esc to close</p>
      </footer>
    </section>
  );
}
