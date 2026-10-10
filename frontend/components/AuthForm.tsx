"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, auth } from "@/services/api";

type Mode = "login" | "register";

const inputClass =
  "w-full rounded border border-line bg-paper px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-brand";

function PasswordField({
  id, label, value, onChange, autoComplete, hint,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string; hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-3">
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          required
          minLength={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={`${inputClass} pr-16`}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-pressed={show}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-brand hover:underline"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  // Already signed in? Go straight to the dashboard.
  useEffect(() => {
    if (auth.get()) router.replace("/dashboard");
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isRegister && password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (isRegister) await api.register(email, password, name);
      const { access_token } = await api.login(email, password);
      auth.set(access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-5xl items-center gap-10 px-4 py-10 md:grid-cols-2">
      <div>
        <h1 className="font-display text-4xl font-bold leading-tight text-brand">AegisAI</h1>
        <p className="mt-3 max-w-md text-lg">
          Scan a domain or IP you are allowed to test. Get open ports, known CVEs, a risk score, and a fix list you can hand to your team.
        </p>
        <p className="mt-6 max-w-md text-sm text-muted">Only scan systems you own or have written permission to assess.</p>
      </div>

      <form onSubmit={submit} className="rounded-panel border border-line bg-surface p-6">
        <h2 className="mb-4 font-display text-xl font-semibold">{isRegister ? "Create your account" : "Sign in"}</h2>

        {isRegister && (
          <div className="mb-3">
            <label htmlFor="name" className="mb-1 block text-sm font-medium">Full name</label>
            <input id="name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputClass} />
          </div>
        )}

        <div className="mb-3">
          <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={inputClass} />
        </div>

        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete={isRegister ? "new-password" : "current-password"}
          hint={isRegister ? "Use at least 8 characters." : undefined}
        />

        {isRegister && (
          <PasswordField id="confirm" label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        )}

        {error && <p role="alert" className="mb-3 text-sm font-medium text-sev-critical">{error}</p>}

        <button
          disabled={busy}
          className="w-full rounded bg-brand py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
        </button>

        <p className="mt-4 text-center text-sm text-muted">
          {isRegister ? "Already have an account? " : "New to AegisAI? "}
          <Link href={isRegister ? "/login" : "/register"} className="font-medium text-brand hover:underline">
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </form>
    </main>
  );
}
