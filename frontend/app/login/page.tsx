"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { API_URL, errorMessage, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const login = async () => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      // The OAuth2 form calls the email field "username".
      body: new URLSearchParams({ username: email, password }),
    });
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) throw new Error(errorMessage(data, "Login failed"));
    setToken((data as { access_token: string }).access_token);
    router.replace("/");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register") {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });
        const data: unknown = await res.json().catch(() => null);
        if (!res.ok) throw new Error(errorMessage(data, "Registration failed"));
      }
      await login();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const field = "w-full rounded-lg border border-cyan-400/30 bg-black/40 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-300 focus:shadow-[0_0_18px_rgba(34,211,238,0.25)]";

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <form onSubmit={submit} className="glass animate-soc-rise w-full max-w-sm space-y-4 rounded-2xl border border-cyan-400/25 p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-400/40 bg-cyan-400/10 text-cyan-300 shadow-[0_0_22px_rgba(34,211,238,0.35)]">
            <ShieldCheck size={24} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-bold leading-none text-white">Aegis<span className="text-cyan-300">AI</span></h1>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.28em] text-slate-400">SOC Command Center</p>
          </div>
        </div>
        <p className="text-sm text-slate-400">{mode === "login" ? "Sign in to continue" : "Create your account"}</p>

        {mode === "register" && (
          <input className={field} placeholder="Username" aria-label="Username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} />
        )}
        <input className={field} type="email" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input
          className={field}
          type="password"
          placeholder={mode === "register" ? "Password (min 10 characters)" : "Password"}
          aria-label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={mode === "register" ? 10 : 1}
        />

        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

        <button disabled={busy} className="w-full rounded-lg border border-cyan-300/50 bg-cyan-400/15 py-3 font-mono text-sm font-semibold tracking-widest text-cyan-200 transition hover:bg-cyan-400/25 disabled:opacity-40">
          {busy ? "PLEASE WAIT..." : mode === "login" ? "SIGN IN" : "REGISTER"}
        </button>

        <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="w-full text-sm text-slate-400 hover:text-white">
          {mode === "login" ? "No account? Register" : "Have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}
