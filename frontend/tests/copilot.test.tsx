import { render, screen, within, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import AssistantWidget from "@/components/AssistantWidget";
import { CopilotProvider, useCopilot } from "@/hooks/useCopilot";
import type { ActiveScan } from "@/lib/types";
import { delta, done, fullStream, installApi, json, liveStream, ndjson, type Call, type Handler } from "./fixtures";

interface AskBody {
  question: string;
  history: { role: string; content: string }[];
  scan_id?: number;
}

let calls: Call[];
let historyRows: unknown[];
let askHandler: Handler;

beforeEach(() => {
  historyRows = [];
  askHandler = () => fullStream(delta("ok"), done("ok"));
  window.localStorage.setItem("aegisai_token", "tok123");
  calls = installApi({
    "GET /assistant/history": () => json(200, historyRows),
    "DELETE /assistant/history": () => json(200, { deleted: 1 }),
    "POST /assistant/ask/stream": (call) => askHandler(call),
  }).calls;
});

const asks = () => calls.filter((c) => c.path === "/assistant/ask/stream");
const bodyOf = (call: Call): AskBody => call.body as unknown as AskBody;

const Widget = ({ activeScan = null }: { activeScan?: ActiveScan | null }) => (
  <CopilotProvider>
    <AssistantWidget activeScan={activeScan} />
  </CopilotProvider>
);

const open = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: /open security copilot/i }));
  return screen.getByRole("dialog", { name: /security copilot/i });
};
const send = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  await user.type(screen.getByRole("textbox", { name: /your question/i }), text);
  await user.click(screen.getByRole("button", { name: /^ask$/i }));
};

describe("popup basics", () => {
  it("is a floating launcher until clicked, then a dialog with example prompts", async () => {
    const user = userEvent.setup();
    render(<Widget />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(calls).toHaveLength(0);
    const dialog = await open(user);
    expect(screen.queryByRole("button", { name: /open security copilot/i })).not.toBeInTheDocument();
    expect(within(dialog).getByText(/explain how a soc analyst triages/i)).toBeInTheDocument();
    await waitFor(() => expect(calls[0].url).toContain("/assistant/history?limit=20"));
    expect(calls[0].auth).toBe("Bearer tok123");
  });

  it("Esc and Close close it; the conversation and history fetch survive reopening", async () => {
    const user = userEvent.setup();
    render(<Widget />);
    await open(user);
    askHandler = () => fullStream(delta("hello there"), done("hello there"));
    await send(user, "Say hello please");
    await screen.findByText("hello there");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await open(user);
    expect(screen.getByText("hello there")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /close security copilot/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(calls.filter((c) => c.url.includes("/assistant/history") && c.method === "GET")).toHaveLength(1);
  });

  it("restores a saved conversation from the server, rendered as Markdown", async () => {
    historyRows = [{ id: 7, question: "What is a SIEM?", answer: "A **SIEM** collects logs.", mode: "llm", sources: [] }];
    const user = userEvent.setup();
    render(<Widget />);
    await open(user);
    expect(await screen.findByText("What is a SIEM?")).toBeInTheDocument();
    expect(screen.getByText("SIEM", { selector: "strong" })).toBeInTheDocument();
    expect(screen.queryByText(/explain how a soc analyst/i)).not.toBeInTheDocument();
  });

  it("expand button switches between the compact and the wide window", async () => {
    const user = userEvent.setup();
    render(<Widget />);
    const dialog = await open(user);
    expect(dialog.className).toContain("sm:w-[440px]");
    await user.click(screen.getByRole("button", { name: /expand window/i }));
    expect(dialog.className).toContain("sm:w-[720px]");
    await user.click(screen.getByRole("button", { name: /shrink window/i }));
    expect(dialog.className).toContain("sm:w-[440px]");
  });

  it("the window is opaque enough to read over a busy page", async () => {
    const user = userEvent.setup();
    render(<Widget />);
    const dialog = await open(user);
    expect(dialog.className).toContain("glass-strong");
  });

  it("Enter sends, Shift+Enter adds a line, very short input cannot be sent", async () => {
    const user = userEvent.setup();
    render(<Widget />);
    await open(user);
    const box = screen.getByRole("textbox", { name: /your question/i });
    await user.type(box, "hi");
    expect(screen.getByRole("button", { name: /^ask$/i })).toBeDisabled();
    await user.clear(box);
    await user.type(box, "line one{Shift>}{Enter}{/Shift}line two");
    expect(box).toHaveValue("line one\nline two");
    expect(asks()).toHaveLength(0);
    await user.type(box, "{Enter}");
    await waitFor(() => expect(asks()).toHaveLength(1));
  });
});

describe("streaming answers", () => {
  it("shows text as it arrives (even when JSON lines are split mid-way), then the final sources", async () => {
    const user = userEvent.setup();
    const live = liveStream();
    askHandler = () => live.response;
    render(<Widget />);
    await open(user);
    await send(user, "Explain MFA fatigue");

    expect(await screen.findByText("Analyzing...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^ask$/i })).not.toBeInTheDocument();

    await act(async () => { live.push('{"type":"delta","te'); });
    await act(async () => { live.push('xt":"MFA fatigue "}\n{"type":"delta","text":"is a push-bombing attack"}\n'); });
    expect(await screen.findByText(/MFA fatigue is a push-bombing attack/)).toBeInTheDocument();
    expect(screen.queryByText("Analyzing...")).not.toBeInTheDocument();

    await act(async () => {
      live.push(done("MFA fatigue is a push-bombing attack [1].", {
        sources: [{ id: 1, title: "Authentication and Password Security", section: "Multi-factor authentication", excerpt: "MFA combines...", cited: true }] }));
      live.close();
    });
    expect(await screen.findByText("Sources (1)")).toBeInTheDocument();
    expect(screen.getByText("cited")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /^ask$/i })).toBeInTheDocument();
    expect(bodyOf(asks()[0])).toEqual({ question: "Explain MFA fatigue", history: [] });
  });

  it("only one request runs at a time", async () => {
    const user = userEvent.setup();
    const live = liveStream();
    askHandler = () => live.response;
    render(<Widget />);
    await open(user);
    await send(user, "First question here");
    await screen.findByText("Analyzing...");
    await user.type(screen.getByRole("textbox", { name: /your question/i }), "Second question{Enter}");
    expect(asks()).toHaveLength(1);
    await act(async () => { live.push(done("fin")); live.close(); });
  });

  it("Stop aborts the request and keeps the partial answer", async () => {
    const user = userEvent.setup();
    askHandler = (call) => { const s = liveStream(call.signal); s.push(delta("Partial answer so far")); return s.response; };
    render(<Widget />);
    await open(user);
    await send(user, "Tell me about ransomware");
    await screen.findByText(/Partial answer so far/);
    await user.click(screen.getByRole("button", { name: /stop/i }));
    expect(asks()[0].signal?.aborted).toBe(true);
    expect(await screen.findByText("Stopped")).toBeInTheDocument();
    expect(screen.getByText(/Partial answer so far/)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /^ask$/i })).toBeInTheDocument();
  });

  it("a mid-stream error keeps what arrived and explains the interruption", async () => {
    const user = userEvent.setup();
    askHandler = () => fullStream(delta("Half an ans"), ndjson({ type: "error", message: "The response was interrupted." }));
    render(<Widget />);
    await open(user);
    await send(user, "Explain zero trust");
    expect(await screen.findByText(/Half an ans/)).toBeInTheDocument();
    expect(await screen.findByText("The response was interrupted.")).toBeInTheDocument();
  });

  it("HTTP errors (e.g. the hourly limit) appear in the window and are not sent back as history", async () => {
    const user = userEvent.setup();
    askHandler = () => json(429, { detail: "Question limit reached for this hour; please try again later" });
    render(<Widget />);
    await open(user);
    await send(user, "What is the CIA triad?");
    expect(await screen.findByText(/question limit reached/i)).toBeInTheDocument();
    askHandler = () => fullStream(delta("fine"), done("fine"));
    await send(user, "Try again please");
    await screen.findByText("fine");
    expect(bodyOf(asks()[1]).history.map((h) => h.content)).toEqual(["What is the CIA triad?"]);
  });

  it("follow-ups send the recent turns (max 10) as context", async () => {
    const user = userEvent.setup();
    let n = 0;
    askHandler = () => { n += 1; return fullStream(delta(`answer ${n}`), done(`answer ${n}`)); };
    render(<Widget />);
    await open(user);
    for (let i = 1; i <= 7; i++) { await send(user, `question number ${i}`); await screen.findByText(`answer ${i}`); }
    const last = bodyOf(asks()[6]).history;
    expect(last).toHaveLength(10);                          // 6 earlier exchanges = 12 messages, newest 10 kept
    expect(last[0]).toEqual({ role: "user", content: "question number 2" });
    expect(last[9]).toEqual({ role: "assistant", content: "answer 6" });
  });

  it("New chat clears the server history and the window", async () => {
    historyRows = [{ id: 1, question: "Old question?", answer: "Old answer", mode: "llm", sources: [] }];
    const user = userEvent.setup();
    render(<Widget />);
    await open(user);
    await screen.findByText("Old question?");
    await user.click(screen.getByRole("button", { name: /new chat/i }));
    await waitFor(() => expect(screen.queryByText("Old question?")).not.toBeInTheDocument());
    expect(calls.some((c) => c.method === "DELETE" && c.url.includes("/assistant/history"))).toBe(true);
    expect(screen.getByText(/explain how a soc analyst triages/i)).toBeInTheDocument();
  });
});

describe("ChatGPT-style formatting", () => {
  const rich = [
    "## Quick answer", "", "SQL injection is **dangerous** and common.", "",
    "1. Use parameterised queries", "2. Validate input", "", "- least privilege", "", "| Layer | Control |", "|---|---|", "| App | Prepared statements |", "",
    "```python", "cur.execute(\"SELECT * FROM t WHERE id = %s\", (uid,))", "```", "",
    "Use `psycopg` and read [the OWASP guide](https://owasp.org).",
  ].join("\n");

  it("renders headings, bold, lists, tables, code blocks, inline code and links", async () => {
    const user = userEvent.setup();
    askHandler = () => fullStream(delta(rich), done(rich));
    render(<Widget />);
    const dialog = await open(user);
    await send(user, "How do I stop SQL injection?");
    await screen.findByText("Quick answer");
    expect(within(dialog).getByText("dangerous", { selector: "strong" })).toBeInTheDocument();
    expect(dialog.querySelectorAll("ol li")).toHaveLength(2);
    expect(dialog.querySelectorAll("ul li")).toHaveLength(1);
    expect(dialog.querySelector("table th")?.textContent).toBe("Layer");
    expect(dialog.querySelector("table td")?.textContent).toBe("App");
    expect(dialog.querySelector("pre code")?.textContent).toContain("cur.execute");
    expect(within(dialog).getByText("psycopg", { selector: "code" })).toBeInTheDocument();
    const link = within(dialog).getByRole("link", { name: "the OWASP guide" });
    expect(link).toHaveAttribute("href", "https://owasp.org");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("never renders raw HTML or javascript: links from the model", async () => {
    const user = userEvent.setup();
    const evil = 'Hi <img src=x onerror="alert(1)"> <script>alert(2)</script> [click](javascript:alert(3)) <b>raw</b>';
    askHandler = () => fullStream(delta(evil), done(evil));
    render(<Widget />);
    const dialog = await open(user);
    await send(user, "What is XSS?");
    await screen.findByText(/Hi/);
    expect(dialog.querySelector("img")).toBeNull();
    expect(dialog.querySelector("script")).toBeNull();
    expect(dialog.querySelector("b")).toBeNull();
    const links = [...dialog.querySelectorAll("a")].map((a) => a.getAttribute("href") ?? "");
    expect(links.some((h) => h.toLowerCase().startsWith("javascript:"))).toBe(false);
  });

  it("the user's own messages stay plain text", async () => {
    const user = userEvent.setup();
    render(<Widget />);
    const dialog = await open(user);
    await send(user, "what does **this** do");
    await screen.findByText("ok");
    expect(within(dialog).getByText("what does **this** do")).toBeInTheDocument();
    expect(within(dialog).queryByText("this", { selector: "strong" })).toBeNull();
  });
});

// ======================================================================== scan-aware Security Copilot
describe("scan-aware Security Copilot", () => {
  const scan: ActiveScan = { id: 12, target: "example.com" };

  it("without a scan it offers general questions and no scan context", async () => {
    const user = userEvent.setup();
    render(<Widget />);
    await open(user);
    expect(screen.getByText(/Run a scan and I can analyze it too/)).toBeInTheDocument();
    expect(screen.queryByText(/Scan context/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Analyze latest scan" })).toBeNull();
  });

  it("with a scan it shows the context and the three analyst quick actions", async () => {
    const user = userEvent.setup();
    render(<Widget activeScan={scan} />);
    await open(user);
    expect(screen.getByText(/Scan context:/)).toHaveTextContent("example.com");
    expect(screen.getByText(/Scan context:/)).toHaveTextContent("#12");
    for (const q of ["Analyze latest scan", "Explain this vulnerability", "How can I fix this issue?"]) {
      expect(screen.getByRole("button", { name: q })).toBeInTheDocument();
    }
    expect(screen.getByPlaceholderText("Ask about this scan...")).toBeInTheDocument();
  });

  it("sends the scan id along with a quick action", async () => {
    const user = userEvent.setup();
    render(<Widget activeScan={scan} />);
    await open(user);
    await user.click(screen.getByRole("button", { name: "Analyze latest scan" }));
    await waitFor(() => expect(asks()).toHaveLength(1));
    expect(asks()[0].body).toEqual({ question: "Analyze latest scan", history: [], scan_id: 12 });
  });

  it("removing the context stops sending the scan id, and a different scan brings it back", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Widget activeScan={scan} />);
    await open(user);
    await user.click(screen.getByRole("button", { name: "Remove scan context" }));
    expect(screen.queryByText(/Scan context/)).toBeNull();
    await send(user, "What is the CIA triad?");
    await waitFor(() => expect(asks()).toHaveLength(1));
    expect(asks()[0].body).not.toHaveProperty("scan_id");
    await screen.findByText("ok");
    rerender(<Widget activeScan={{ id: 13, target: "other.example.org" }} />);
    expect(screen.getByText(/Scan context:/)).toHaveTextContent("other.example.org");
    await send(user, "And this new scan?");
    await waitFor(() => expect(asks()).toHaveLength(2));
    expect(bodyOf(asks()[1]).scan_id).toBe(13);
  });

  it("labels an analyst brief and shows its notice", async () => {
    const user = userEvent.setup();
    askHandler = () => fullStream(delta("**Report**"), done("**AegisAI Analyst Report: example.com**", { mode: "analyst", notice: "AI answers are not configured, so the AegisAI analyst report for this scan is shown instead." }));
    render(<Widget activeScan={scan} />);
    await open(user);
    await user.click(screen.getByRole("button", { name: "Analyze latest scan" }));
    expect(await screen.findByText("ANALYST BRIEF")).toBeInTheDocument();
    expect(screen.getByText(/AI answers are not configured/)).toBeInTheDocument();
    expect(screen.getByText("AegisAI Analyst Report: example.com", { selector: "strong" })).toBeInTheDocument();
  });

  it("labels knowledge-base passages", async () => {
    const user = userEvent.setup();
    askHandler = () => fullStream(done("Here are the passages", { mode: "retrieval_only" }));
    render(<Widget />);
    await open(user);
    await send(user, "What is the CIA triad?");
    expect(await screen.findByText("KNOWLEDGE BASE")).toBeInTheDocument();
  });

  it("answers a question sent from another panel, opening the window by itself", async () => {
    const user = userEvent.setup();
    const Panel = () => {
      const { openWith } = useCopilot();
      return <button onClick={() => openWith("Explain this finding and why it matters: Exposed Telnet service detected on port 23")}>explain from panel</button>;
    };
    render(<CopilotProvider><Panel /><AssistantWidget activeScan={scan} /></CopilotProvider>);
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "explain from panel" }));
    expect(screen.getByRole("dialog", { name: /security copilot/i })).toBeInTheDocument();
    await waitFor(() => expect(asks()).toHaveLength(1));
    expect(asks()[0].body).toMatchObject({ scan_id: 12, question: expect.stringContaining("Exposed Telnet service detected on port 23") });
    expect(await screen.findByText("ok")).toBeInTheDocument();
  });

  it("a question from another panel waits for the current answer to finish", async () => {
    const user = userEvent.setup();
    const live = liveStream();
    askHandler = () => live.response;
    const Panel = () => {
      const { openWith } = useCopilot();
      return <button onClick={() => openWith("Second question from a panel")}>ask from panel</button>;
    };
    render(<CopilotProvider><Panel /><AssistantWidget activeScan={scan} /></CopilotProvider>);
    await user.click(screen.getByRole("button", { name: "ask from panel" }));
    await waitFor(() => expect(asks()).toHaveLength(1));
    await user.click(screen.getByRole("button", { name: "ask from panel" }));
    await new Promise((r) => setTimeout(r, 60));
    expect(asks()).toHaveLength(1);                                   // still waiting: one answer at a time
    askHandler = () => fullStream(delta("ok"), done("ok"));
    await act(async () => { live.push(done("first")); live.close(); });
    await waitFor(() => expect(asks()).toHaveLength(2));
    expect(bodyOf(asks()[1]).question).toBe("Second question from a panel");
  });

  it("never renders images from model output (a hostile banner could steer it to a tracking pixel)", async () => {
    const user = userEvent.setup();
    const answer = "Look: ![x](http://evil.example/pixel.png?c=1) done";
    askHandler = () => fullStream(delta(answer), done(answer));
    render(<Widget activeScan={scan} />);
    const dialog = await open(user);
    await user.click(screen.getByRole("button", { name: "Analyze latest scan" }));
    await screen.findByText(/image removed/);
    expect(dialog.querySelector("img")).toBeNull();
  });
});
