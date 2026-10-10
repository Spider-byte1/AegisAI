"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api";
import Markdown from "@/components/Markdown";

type Source = { id: number; title: string; section: string; excerpt: string; cited: boolean };

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: "llm" | "retrieval_only" | "no_context";
  notice?: string | null;
  sources?: Source[];
  error?: boolean;
  streaming?: boolean;
  stopped?: boolean;
};

type HistoryRow = {
  id: number;
  question: string;
  answer: string;
  mode: Message["mode"];
  sources: Source[];
};

// One JSON object per line from POST /assistant/ask/stream
type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; answer: string; mode: Message["mode"]; sources: Source[]; notice?: string | null }
  | { type: "error"; message: string };

const EXAMPLES = [
  "Explain how a SOC analyst triages an alert",
  "What is the difference between SPF, DKIM and DMARC?",
  "How does a SQL injection work and how do I prevent it?",
  "Write a short checklist to harden an SSH server",
];

const MAX_QUESTION = 1000;
const HISTORY_TURNS = 10;

/** Floating chat bubble that opens the Security Assistant as a popup window. */
export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const historyLoaded = useRef(false);

  // Load the earlier conversation the first time the popup is opened.
  useEffect(() => {
    if (!open || historyLoaded.current) return;
    historyLoaded.current = true;
    (async () => {
      const res = await apiFetch("/assistant/history?limit=20");
      if (!res.ok) {
        historyLoaded.current = false; // try again next time it opens
        return;
      }
      const rows: HistoryRow[] = await res.json();
      // Don't overwrite anything the user already typed while this was loading.
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

  // Esc closes the popup (a running answer keeps streaming in the background).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: busy ? "auto" : "smooth" });
  }, [messages, busy, open]);

  const ask = async (text: string) => {
    const question = text.trim();
    if (question.length < 3 || busy) return;

    // Recent successful turns give the assistant conversational context.
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
    const patch = (fn: (m: Message) => Message) =>
      setMessages((prev) => prev.map((m) => (m.id === answerId ? fn(m) : m)));

    const handle = (event: StreamEvent) => {
      if (event.type === "delta") {
        patch((m) => ({ ...m, content: m.content + event.text }));
      } else if (event.type === "done") {
        // `done` carries the authoritative final text, mode and sources.
        patch((m) => ({ ...m, content: event.answer, mode: event.mode, sources: event.sources, notice: event.notice, streaming: false }));
      } else if (event.type === "error") {
        throw new Error(event.message);
      }
    };

    try {
      const res = await apiFetch("/assistant/ask/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(errorMessage(data, "The assistant could not answer"));
      }
      if (!res.body) throw new Error("The assistant sent an empty response");

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
        patch((m) =>
          m.content
            ? { ...m, streaming: false, notice: message } // keep what already arrived
            : { ...m, streaming: false, error: true, content: message }
        );
      }
    } finally {
      abortRef.current = null;
      patch((m) => ({ ...m, streaming: false }));
      setBusy(false);
    }
  };

  const clearChat = async () => {
    abortRef.current?.abort();
    const res = await apiFetch("/assistant/history", { method: "DELETE" });
    if (res.ok) setMessages([]);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Security Assistant"
        aria-expanded={false}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-cyan-600 hover:bg-cyan-500 px-5 py-3 font-semibold text-white shadow-lg shadow-cyan-900/50"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Security Assistant
      </button>
    );
  }

  const size = wide
    ? "sm:w-[720px] sm:h-[calc(100vh-3rem)]"
    : "sm:w-[440px] sm:h-[660px] sm:max-h-[calc(100vh-3rem)]";

  return (
    <section
      role="dialog"
      aria-label="Security Assistant"
      className={`fixed bottom-6 right-6 z-50 flex flex-col w-[calc(100vw-2rem)] h-[calc(100vh-3rem)] ${size} overflow-hidden rounded-2xl border border-cyan-800 bg-slate-950 text-white shadow-2xl shadow-black/60`}
    >
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
        <div>
          <h2 className="font-bold text-cyan-400">Security Assistant</h2>
          <p className="text-xs text-gray-400">Ask me anything about cybersecurity</p>
        </div>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button onClick={clearChat} className="text-xs text-gray-400 hover:text-white underline">
              New chat
            </button>
          )}
          <button
            onClick={() => setWide((w) => !w)}
            aria-label={wide ? "Shrink window" : "Expand window"}
            className="hidden rounded p-1 text-gray-400 hover:bg-slate-800 hover:text-white sm:block"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {wide ? <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" /> : <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />}
            </svg>
          </button>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close Security Assistant"
            className="rounded p-1 text-gray-400 hover:bg-slate-800 hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <div>
            <p className="mb-3 text-sm text-gray-300">
              Hi! Ask me about threats, tools, logs, scan results, SOC work or interview prep. I can make mistakes, so
              double-check anything important.
            </p>
            <div className="flex flex-col gap-2">
              {EXAMPLES.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  disabled={busy}
                  className="rounded-lg border border-cyan-900 bg-slate-900 px-3 py-2 text-left text-sm hover:bg-slate-800"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-cyan-700 px-3 py-2 text-sm"
                  : `max-w-[95%] min-w-0 rounded-2xl rounded-bl-sm px-3 py-2 text-sm ${m.error ? "border border-red-800 bg-red-950" : "bg-slate-900"}`
              }
            >
              {m.notice && <p className="mb-2 text-xs text-yellow-400">{m.notice}</p>}

              {m.role === "user" || m.error ? (
                // Plain text on purpose: React escapes it.
                <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
              ) : m.content ? (
                <div className="break-words">
                  <Markdown>{m.content}</Markdown>
                  {m.streaming && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-cyan-400 align-middle" aria-hidden="true" />}
                </div>
              ) : (
                <p className="animate-pulse text-gray-400">Thinking...</p>
              )}

              {m.stopped && <p className="mt-1 text-xs text-gray-500">Stopped</p>}

              {m.sources && m.sources.length > 0 && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-cyan-400">Sources ({m.sources.length})</summary>
                  <ul className="mt-2 space-y-2">
                    {[...m.sources]
                      .sort((a, b) => Number(b.cited) - Number(a.cited))
                      .map((s) => (
                        <li key={s.id} className="rounded-lg bg-slate-800 p-2">
                          <p className="font-semibold">
                            [{s.id}] {s.title} &mdash; {s.section}
                            {s.cited && <span className="ml-2 text-green-400">cited</span>}
                          </p>
                          <p className="mt-1 text-gray-400">{s.excerpt}</p>
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

      <footer className="border-t border-slate-800 bg-slate-900 p-3">
        <div className="flex items-end gap-2">
          <textarea
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_QUESTION))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            rows={2}
            aria-label="Your question"
            placeholder="Message the Security Assistant..."
            className="flex-1 resize-none rounded-lg border border-cyan-700 bg-slate-950 p-2 text-sm"
          />
          {busy ? (
            <button
              onClick={() => abortRef.current?.abort()}
              className="rounded-lg border border-red-700 bg-red-900/60 px-4 py-2 text-sm hover:bg-red-800"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={() => ask(input)}
              disabled={input.trim().length < 3}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Ask
            </button>
          )}
        </div>
        <p className="mt-1 text-[11px] text-gray-500">
          Enter to send, Shift+Enter for a new line &middot; Esc to close
        </p>
      </footer>
    </section>
  );
}
