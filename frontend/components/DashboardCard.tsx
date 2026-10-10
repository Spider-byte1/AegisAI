export default function DashboardCard({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`font-display text-3xl font-bold ${tone ?? "text-ink"}`}>{value}</p>
    </div>
  );
}
