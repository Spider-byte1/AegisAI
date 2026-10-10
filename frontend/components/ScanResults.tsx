import type { Recommendation, ScanResults as Results } from "@/services/types";
import SeverityBadge from "./SeverityBadge";

const PRIORITY_CLASS: Record<Recommendation["priority"], string> = {
  Immediate: "bg-sev-critical text-white",
  High: "bg-sev-high/15 text-sev-high",
  Medium: "bg-sev-medium/15 text-sev-medium",
  Low: "bg-brand-tint text-brand-dark",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-panel border border-line bg-surface">
      <h2 className="border-b border-line px-5 py-3 font-display text-lg font-semibold">{title}</h2>
      <div className="p-5">{children}</div>
    </section>
  );
}

const th = "py-2 pr-4 text-left font-medium text-muted";
const td = "py-2 pr-4 align-top";

export default function ScanResults({ r }: { r: Results }) {
  return (
    <div className="space-y-5">
      {r.warnings.length > 0 && (
        <div role="note" className="rounded-panel border border-sev-medium/40 bg-sev-medium/10 px-4 py-3 text-sm">
          {r.warnings.join(" ")}
        </div>
      )}

      <Section title="Recommendations">
        <ul className="space-y-4">
          {r.recommendations.map((rec, i) => (
            <li key={i} className="flex gap-3">
              <span className={`mt-0.5 h-fit shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${PRIORITY_CLASS[rec.priority]}`}>
                {rec.priority}
              </span>
              <div className="text-sm">
                <p className="font-semibold">{rec.title}</p>
                <p className="text-muted">{rec.issue} {rec.why}</p>
                <p className="mt-1">{rec.fix}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Open ports and services">
        {r.ports.length === 0 ? (
          <p className="text-sm text-muted">No open ports were detected.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th className={th}>Port</th><th className={th}>Service</th><th className={th}>Product and version</th><th className={th}>Banner</th></tr></thead>
              <tbody>
                {r.ports.map((p) => (
                  <tr key={p.port} className="border-t border-line">
                    <td className={td}>{p.port}/{p.protocol}</td>
                    <td className={td}>{p.service}</td>
                    <td className={td}>{`${p.product ?? ""} ${p.version ?? ""}`.trim() || "-"}</td>
                    <td className={`${td} break-all text-muted`}>{p.banner || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Potential vulnerabilities">
        {r.vulnerabilities.length === 0 ? (
          <p className="text-sm text-muted">No known CVEs matched the detected versions.</p>
        ) : (
          <>
            <ul className="divide-y divide-line">
              {r.vulnerabilities.map((v) => (
                <li key={`${v.cve}-${v.port}`} className="py-3 text-sm first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{v.cve}</strong>
                    <SeverityBadge level={v.severity} />
                    <span className="text-muted">CVSS {v.cvss} on port {v.port}</span>
                    {v.known_exploited && <span className="rounded bg-sev-critical px-2 py-0.5 text-xs font-semibold text-white">Actively exploited</span>}
                  </div>
                  <p className="mt-1 text-muted">{v.description}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">Matches come from version strings. Your OS vendor may have backported the fix, so verify before acting.</p>
          </>
        )}
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="TLS certificate">
          {r.ssl.available ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted">Issuer</dt><dd className="break-all">{r.ssl.issuer}</dd>
              <dt className="text-muted">Valid until</dt><dd>{r.ssl.valid_to ? new Date(r.ssl.valid_to).toLocaleDateString() : "-"}</dd>
              <dt className="text-muted">Protocol</dt><dd>{r.ssl.protocol}</dd>
              <dt className="text-muted">Issues</dt><dd>{r.ssl.issues?.length ? r.ssl.issues.join("; ") : "None found"}</dd>
            </dl>
          ) : (
            <p className="text-sm text-muted">No TLS service answered on port 443.</p>
          )}
        </Section>
        <Section title="DNS and registration">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">A records</dt><dd>{r.dns.A?.join(", ") || "-"}</dd>
            <dt className="text-muted">Name servers</dt><dd>{r.dns.NS?.join(", ") || "-"}</dd>
            <dt className="text-muted">Registrar</dt><dd>{r.whois.registrar || "-"}</dd>
            <dt className="text-muted">Expires</dt><dd>{r.whois.expiration_date?.slice(0, 10) || "-"}</dd>
          </dl>
        </Section>
      </div>

      <Section title="How the score was calculated">
        <table className="w-full text-sm">
          <tbody>
            {r.risk.factors.map((f, i) => (
              <tr key={i} className="border-t border-line first:border-0">
                <td className="py-1.5 pr-4">{f.factor}</td>
                <td className="py-1.5 text-right font-medium">+{f.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
