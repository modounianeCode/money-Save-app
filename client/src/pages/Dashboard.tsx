import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { formatFCFA, formatDate, toDateInput, monthLabel, currentMonth } from "../lib/format";
import type { MonthSummary, BudgetAlert, Transaction } from "../types";

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);

  useEffect(() => {
    const month = currentMonth();
    api<MonthSummary>(`/stats/month?month=${month}`).then(setSummary).catch(console.error);
    api<BudgetAlert[]>(`/stats/budget-alerts?month=${month}`).then(setAlerts).catch(console.error);
    api<Transaction[]>("/transactions").then((t) => setRecent(t.slice(0, 8))).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-slate-500">💵 Solde du mois</p>
          <p className="text-2xl font-bold text-green-600">{formatFCFA(summary?.balance ?? 0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-slate-500">📥 Revenus</p>
          <p className="text-2xl font-bold text-slate-900">{formatFCFA(summary?.totalIncome ?? 0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-slate-500">📤 Dépenses</p>
          <p className="text-2xl font-bold text-red-500">{formatFCFA(summary?.totalExpenses ?? 0)}</p>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold mb-3">🚨 Alertes budgétaires</h2>
          <div className="space-y-2">
            {alerts.map((a) => (
              <div
                key={a.budgetId}
                className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                  a.status === "exceeded" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{a.category.icon}</span>
                  <div>
                    <p className="font-medium">{a.category.name}</p>
                    <p className="text-sm text-slate-500">
                      {formatFCFA(a.spent)} / {formatFCFA(a.budgetAmount)}
                    </p>
                  </div>
                </div>
                <span className="font-bold">
                  {a.status === "exceeded" ? "Dépassé !" : `${a.percentage}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">📒 Dernières transactions</h2>
          <button
            onClick={() => navigate("/transactions")}
            className="text-sm text-indigo-600 hover:underline font-medium"
          >
            Voir tout →
          </button>
        </div>
        <div className="space-y-2">
          {recent.length === 0 && (
            <p className="text-slate-500 text-sm">
              Aucune transaction. Ajoute ta première dépense pour commencer !
            </p>
          )}
          {recent.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: `${t.category.color}22` }}
              >
                {t.category.icon}
              </span>
              <div className="flex-1">
                <p className="font-medium">{t.description || t.category.name}</p>
                <p className="text-xs text-slate-500">
                  {t.category.name} · {formatDate(t.date)}
                </p>
              </div>
              <span className={`font-semibold ${t.type === "INCOME" ? "text-green-600" : "text-red-500"}`}>
                {t.type === "INCOME" ? "+" : "−"}{formatFCFA(t.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}