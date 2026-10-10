"use client";
import ActivityChart from "@/components/ActivityChart";
import DashboardCard from "@/components/DashboardCard";
import RecentScansTable from "@/components/RecentScansTable";
import RiskChart from "@/components/RiskChart";
import ScanForm from "@/components/ScanForm";
import TopPortsChart from "@/components/TopPortsChart";
import { useDashboard } from "@/hooks/useDashboard";

const panel = "rounded-panel border border-line bg-surface";

export default function DashboardPage() {
  const { data, error } = useDashboard();

  return (
    <div className="space-y-5">
      <ScanForm />

      {error && <p role="alert" className="text-sm font-medium text-sev-critical">{error}</p>}

      {data && (
        <>
          <div className={`${panel} grid grid-cols-2 divide-line sm:grid-cols-3 lg:grid-cols-6 lg:divide-x`}>
            <DashboardCard label="Total scans" value={data.total_scans} />
            <DashboardCard label="Running now" value={data.active_scans} />
            <DashboardCard label="Critical" value={data.critical} tone={data.critical ? "text-sev-critical" : undefined} />
            <DashboardCard label="High risk" value={data.high} tone={data.high ? "text-sev-high" : undefined} />
            <DashboardCard label="Reports" value={data.reports} />
            <DashboardCard label="Average risk" value={data.average_risk} />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <section className={`${panel} lg:col-span-2`}>
              <h2 className="border-b border-line px-5 py-3 font-display text-lg font-semibold">Recent scans</h2>
              <RecentScansTable scans={data.recent_scans} />
            </section>
            <section className={`${panel} p-5`}>
              <h2 className="mb-3 font-display text-lg font-semibold">Risk levels</h2>
              <RiskChart distribution={data.risk_distribution} />
            </section>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className={`${panel} p-5`}>
              <h2 className="mb-3 font-display text-lg font-semibold">Scans this week</h2>
              <ActivityChart data={data.weekly_activity} />
            </section>
            <section className={`${panel} p-5`}>
              <h2 className="mb-3 font-display text-lg font-semibold">Most common open ports</h2>
              <TopPortsChart data={data.top_ports} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
