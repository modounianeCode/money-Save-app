import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { formatFCFA, formatDate, monthLabel, currentMonth } from "../lib/format";
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
    api<Transaction[]>("/transactions").then((t) => setRecent(t.slice(0, 6))).catch(console.error);
  }, []);

  const savingsRate =
    summary && summary.totalIncome > 0
      ? Math.round((summary.balance / summary.totalIncome) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3 animate-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bonjour 👋</h1>
          <p className="text-slate-500 text-sm">
            Voici ton résumé financier de <span className="font-medium text-slate-700">{monthLabel(currentMonth())}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate("/transactions")} className="btn-ghost">
            💸 Voir les transactions
          </button>
          <button onClick={() => navigate("/transactions")} className="btn-primary">
            + Nouvelle transaction
          </button>
        </div>
      </div>

      {/* Solde du mois */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 text-white p-6 sm:p-8 shadow-xl shadow-indigo-600/20 animate-in-delay-1">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 -left-10 w-64 h-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-end gap-6">
          <div className="flex-1">
            <p className="text-indigo-200 text-sm font-medium flex items-center gap-2">
              💳 Solde du mois
            </p>
            <p className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-2">
              {formatFCFA(summary?.balance ?? 0)}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs bg-white/15 rounded-full px-3 py-1 font-medium">
                Taux d'épargne : {savingsRate}%
              </span>
              {summary && summary.totalExpenses > 0 && (
                <span className="text-xs bg-white/10 rounded-full px-3 py-1">
                  {summary.totalIncome === 0 ? "⚠️ rentrées manquantes" : savingsRate >= 10 ? "🟢 sur la bonne voie" : "🔶 à surveiller"}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:w-80">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 ring-1 ring-white/15">
              <p className="text-indigo-200 text-xs">📥 Revenus</p>
              <p className="text-lg font-bold mt-1">+{formatFCFA(summary?.totalIncome ?? 0)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 ring-1 ring-white/15">
              <p className="text-indigo-200 text-xs">📤 Dépenses</p>
              <p className="text-lg font-bold mt-1">−{formatFCFA(summary?.totalExpenses ?? 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="rounded-3xl bg-amber-50 ring-1 ring-amber-200 p-5 animate-in-delay-1">
          <h2 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
            🚨 Alertes budgétaires
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {alerts.map((a) => (
              <div
                key={a.budgetId}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 ${
                  a.status === "exceeded" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl">{a.category.icon}</span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.category.name}</p>
                    <p className="text-xs opacity-80">
                      {formatFCFA(a.spent)} / {formatFCFA(a.budgetAmount)}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-sm whitespace-nowrap">
                  {a.status === "exceeded" ? "Dépassé !" : `${a.percentage}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions récentes */}
      <div className="card p-5 sm:p-6 animate-in-delay-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">📒 Dernières transactions</h2>
          <button
            onClick={() => navigate("/transactions")}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
          >
            Tout voir →
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🌱</div>
            <p className="font-medium text-slate-700">Commence à suivre tes dépenses</p>
            <p className="text-sm text-slate-500 max-w-xs mx-auto mt-1">
              Ajoute ta première dépense ou dépense à Nafi en bas à droite, et retrouve tout ici.
            </p>
            <button onClick={() => navigate("/transactions")} className="btn-primary mt-5">
              + Ajouter une transaction
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-3">
                <span
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: `${t.category.color}1f`, color: t.category.color }}
                >
                  {t.category.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{t.description || t.category.name}</p>
                  <p className="text-xs text-slate-500">
                    {t.category.name} · {formatDate(t.date)}
                  </p>
                </div>
                <span
                  className={`font-bold whitespace-nowrap ${
                    t.type === "INCOME" ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {t.type === "INCOME" ? "+" : "−"}{formatFCFA(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}