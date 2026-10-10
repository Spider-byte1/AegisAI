"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { RiskLevel } from "@/services/types";
import { LEVEL_HEX } from "./severity";

export default function RiskChart({ distribution }: { distribution: Record<RiskLevel, number> }) {
  const data = (Object.keys(distribution) as RiskLevel[]).map((k) => ({ name: k, value: distribution[k] }));
  const total = data.reduce((n, d) => n + d.value, 0);
  if (total === 0) return <p className="text-sm text-muted">Risk levels appear here after your first completed scan.</p>;
  return (
    <div className="flex items-center gap-4">
      <div className="h-40 w-40 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={42} outerRadius={70} paddingAngle={2} stroke="none">
              {data.map((d) => (
                <Cell key={d.name} fill={LEVEL_HEX[d.name]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1 text-sm">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: LEVEL_HEX[d.name] }} aria-hidden />
            {d.name}: <strong>{d.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
