import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { api } from "../lib/api";
import { formatFCFA, monthLabel, currentMonth } from "../lib/format";
import type { CategorySpending, MonthlyPoint } from "../types";

const PIE_COLORS = ["#6366f1", "#f97316", "#06b6d4", "#ec4899", "#10b981", "#ec4899", "#eab308", "#8b5cf6", "#22c55e", "#ef4444"];

export default function Stats() {
  const [month, setMonth] = useState(currentMonth());
  const [byCategory, setByCategory] = useState<CategorySpending[]>([]);
  const [monthly, setMonthly] = useState<MonthlyPoint[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    api<CategorySpending[]>(`/stats/by-category?month=${month}`)
      .then((d) => {
        setByCategory(d);
        setTotal(d.reduce((s, c) => s + c.total, 0));
      })
      .catch(console.error);
  }, [month]);

  useEffect(() => {
    api<MonthlyPoint[]>("/stats/monthly?count=6").then(setMonthly).catch(console.error);
  }, []);

  const pieData = byCategory.map((c, i) => ({
    name: `${c.icon} ${c.name}`,
    value: c.total,
    fill: c.color || PIE_COLORS[i % PIE_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 animate-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">📈 Statistiques</h1>
          <p className="text-sm text-slate-500">Visualise où va ton argent</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="input w-auto bg-white"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-semibold mb-1">Répartition des dépenses · {monthLabel(month)}</h2>
          <p className="text-sm text-slate-500 mb-4">Total : {formatFCFA(total)}</p>
          {pieData.length === 0 ? (
            <p className="text-slate-500 text-sm py-10 text-center">Aucune dépense ce mois-ci.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={100} paddingAngle={2}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatFCFA(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-semibold mb-1">Détail par catégorie</h2>
          <div className="space-y-3 mt-4">
            {byCategory.length === 0 && (
              <p className="text-slate-500 text-sm">Aucune donnée.</p>
            )}
            {byCategory.map((c) => {
              const pct = total > 0 ? Math.round((c.total / total) * 100) : 0;
              return (
                <div key={c.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>
                      {c.icon} {c.name}
                    </span>
                    <span className="font-medium">
                      {formatFCFA(c.total)} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-4">Évolution sur 6 mois</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tickFormatter={(m: string) => monthLabel(m).split(" ")[0] + " " + m.slice(0, 4)} />
              <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v) => formatFCFA(Number(v))} labelFormatter={(m) => monthLabel(String(m))} />
              <Legend />
              <Bar dataKey="income" name="Revenus" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}