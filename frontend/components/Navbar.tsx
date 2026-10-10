"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/services/api";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/scans", label: "Scan history" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center gap-8 px-4 py-3">
        <Link href="/dashboard" className="font-display text-xl font-bold text-brand">
          AegisAI
        </Link>
        <nav className="flex flex-1 gap-1" aria-label="Main">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname.startsWith(l.href) ? "page" : undefined}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                pathname.startsWith(l.href) ? "bg-brand-tint text-brand-dark" : "text-muted hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => {
            auth.clear();
            router.push("/login");
          }}
          className="rounded px-3 py-1.5 text-sm font-medium text-muted hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
