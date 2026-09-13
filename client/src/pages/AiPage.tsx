import { useEffect, useState } from "react";
import { api, handleApiError } from "../lib/api";
import { formatFCFA, monthLabel, currentMonth } from "../lib/format";

interface AiInsight {
  title: string;
  detail: string;
}

interface Forecast {
  expenses: number;
  income: number;
  reasoning: string;
  advice: string;
}

export default function AiPage() {
  const [insights, setInsights] = useState<AiInsight[] | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [error, setError] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catResult, setCatResult] = useState("");
  const [catLoading, setCatLoading] = useState(false);

  const nextMonth = () => {
    const [y, m] = currentMonth().split("-").map(Number);
    const d = new Date(y, m, 1);
    return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  };

  const loadInsights = async () => {
    setLoadingInsights(true);
    setError("");
    try {
      const res = await api<{ insights: AiInsight[] }>("/ai/insights");
      setInsights(res.insights);
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setLoadingInsights(false);
    }
  };

  const loadForecast = async () => {
    setLoadingForecast(true);
    setError("");
    try {
      const res = await api<Forecast>("/ai/forecast");
      setForecast(res);
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setLoadingForecast(false);
    }
  };

  const runCategorize = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatLoading(true);
    setCatResult("");
    setError("");
    try {
      const res = await api<{ category: { categoryId: string; categoryName: string } | null }>("/ai/categorize", {
        method: "POST",
        body: JSON.stringify({ description: catDesc }),
      });
      setCatResult(res.category ? `Catégorie suggérée : ${res.category.categoryName} ✓` : "Catégorie non déterminée.");
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setCatLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">🤖 Conseils Nafi</h1>
        <p className="text-sm text-slate-500">
          Analyses basées sur tes données, générées localement par l'IA. Une génération prend environ 1 à 2 minutes.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">📋 Recommandations personnalisées</h2>
            <button
              onClick={loadInsights}
              disabled={loadingInsights}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition"
            >
              {loadingInsights ? "Analyse…" : insights ? "Régénérer" : "Générer"}
            </button>
          </div>
          {!insights && !loadingInsights && (
            <p className="text-slate-500 text-sm">
              Clique sur « Générer » pour obtenir une analyse de tes habitudes de dépenses.
            </p>
          )}
          {loadingInsights && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="animate-pulse bg-slate-100 rounded-xl p-4 h-16" />
              ))}
            </div>
          )}
          {insights && (
            <div className="space-y-3">
              {insights.map((ins, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4">
                  <p className="font-semibold flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center">
                      {i + 1}
                    </span>
                    {ins.title}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">{ins.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">🔮 Prévision · {nextMonth()}</h2>
              <button
                onClick={loadForecast}
                disabled={loadingForecast}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition"
              >
                {loadingForecast ? "Calcul…" : forecast ? "Régénérer" : "Prévoir"}
              </button>
            </div>
            {!forecast && !loadingForecast && (
              <p className="text-slate-500 text-sm">Clique sur « Prévoir » pour estimer ton mois prochain.</p>
            )}
            {loadingForecast && (
              <div className="animate-pulse bg-slate-100 rounded-xl p-4 h-16" />
            )}
            {forecast && (
              <div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-red-50 p-3">
                    <p className="text-xs text-red-500">Dépenses estimées</p>
                    <p className="text-xl font-bold text-slate-900">{formatFCFA(forecast.expenses)}</p>
                  </div>
                  <div className="rounded-xl bg-green-50 p-3">
                    <p className="text-xs text-green-600">Revenus estimés</p>
                    <p className="text-xl font-bold text-slate-900">{formatFCFA(forecast.income)}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600">🧠 {forecast.reasoning}</p>
                <p className="text-sm text-slate-600 mt-1">💡 {forecast.advice}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold mb-3">🏷️ Catégorisation automatique</h2>
            <form onSubmit={runCategorize} className="flex gap-2">
              <input
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Ex : rechargement crédit téléphone"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={catLoading || !catDesc.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 rounded-lg transition"
              >
                {catLoading ? "…" : "Tester"}
              </button>
            </form>
            {catResult && <p className="text-sm text-slate-700 mt-3">{catResult}</p>}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        🛡️ Confidentialité : tout est traité localement sur ta machine via Ollama. Aucune donnée n'est envoyée à un service externe. · {monthLabel(currentMonth())}
      </p>
    </div>
  );
}