"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(errorMessage(data, "Login failed"));
    setToken(data.access_token);
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
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(errorMessage(data, "Registration failed"));
      }
      await login();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full border border-cyan-500 bg-slate-900 p-3 rounded-lg";

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
      <form onSubmit={submit} className="w-full max-w-sm bg-slate-900 p-8 rounded-xl space-y-4">
        <h1 className="text-3xl font-bold text-cyan-400">AegisAI</h1>
        <p className="text-gray-400">{mode === "login" ? "Sign in to continue" : "Create your account"}</p>

        {mode === "register" && (
          <input className={input} placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} />
        )}
        <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input
          className={input}
          type="password"
          placeholder={mode === "register" ? "Password (min 10 characters)" : "Password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={mode === "register" ? 10 : 1}
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button disabled={busy} className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 p-3 rounded-lg">
          {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Register"}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
          className="w-full text-sm text-gray-400 hover:text-white"
        >
          {mode === "login" ? "No account? Register" : "Have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}
