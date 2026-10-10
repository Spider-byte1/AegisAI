"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function ActivityChart({ data }: { data: { date: string; scans: number }[] }) {
  const rows = data.map((d) => ({ ...d, day: new Date(d.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" }) }));
  return (
    <div className="h-44">
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ left: -20, right: 8, top: 8 }}>
          <CartesianGrid stroke="#D5DCE3" vertical={false} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
          <Tooltip />
          <Line type="monotone" dataKey="scans" stroke="#1F4E6B" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
