import { useEffect, useState } from "react";
import { api, handleApiError } from "../lib/api";
import { formatFCFA, currentMonth } from "../lib/format";
import type { Budget, Category, Transaction } from "../types";
import Modal from "../components/Modal";

export default function Budgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [spentByCat, setSpentByCat] = useState<Record<string, number>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const month = currentMonth();

  const load = () => {
    api<Budget[]>(`/budgets?month=${month}`).then(setBudgets).catch(console.error);
    api<Transaction[]>("/transactions?type=EXPENSE")
      .then((txs) => {
        const map: Record<string, number> = {};
        for (const t of txs) {
          map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
        }
        setSpentByCat(map);
      })
      .catch(console.error);
  };

  useEffect(() => {
    api<Category[]>("/categories").then((c) => setCategories(c.filter((x) => !x.isIncome))).catch(console.error);
  }, []);

  useEffect(() => {
    load();
  }, [month]);

  const openCreate = () => {
    setCategoryId("");
    setAmount("");
    setError("");
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const value = Number(amount);
      if (!categoryId || !value || value <= 0) throw new Error("Choisis une catégorie et un montant");
      await api("/budgets", {
        method: "POST",
        body: JSON.stringify({ categoryId, amount: value, month }),
      });
      setModalOpen(false);
      load();
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const budgetedIds = new Set(budgets.map((b) => b.categoryId));
  const unbudgeted = categories.filter((c) => !budgetedIds.has(c.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">🎯 Budgets du mois</h1>
          <p className="text-sm text-slate-500">Définis un plafond mensuel par catégorie</p>
        </div>
        <button
          onClick={openCreate}
          disabled={unbudgeted.length === 0}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg transition"
        >
          + Définir un budget
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgets.length === 0 && (
          <p className="bg-white rounded-2xl p-6 text-slate-500 text-sm">
            Aucun budget défini pour {month}. Clique sur « Définir un budget » pour commencer.
          </p>
        )}
        {budgets.map((b) => {
          const spent = spentByCat[b.categoryId] || 0;
          const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
          const status = pct >= 100 ? "exceeded" : pct >= 80 ? "warning" : pct >= 50 ? "mid" : "ok";
          return (
            <div key={b.id} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="w-11 h-11 rounded-full flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${b.category.color}22` }}
                >
                  {b.category.icon}
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{b.category.name}</p>
                  <p className="text-sm text-slate-500">
                    {formatFCFA(spent)} / {formatFCFA(b.amount)}
                  </p>
                </div>
                <button
                  onClick={() => window.confirm("Supprimer ce budget ?") && api(`/budgets/${b.id}`, { method: "DELETE" }).then(load)}
                  className="text-slate-400 hover:text-red-600"
                >
                  🗑️
                </button>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    status === "exceeded"
                      ? "bg-red-500"
                      : status === "warning"
                      ? "bg-amber-500"
                      : status === "mid"
                      ? "bg-yellow-400"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <p
                className={`text-sm mt-2 font-medium ${
                  status === "exceeded" ? "text-red-600" : status === "warning" ? "text-amber-600" : "text-slate-500"
                }`}
              >
                {status === "exceeded"
                  ? "Budget dépassé !"
                  : status === "warning"
                  ? `${pct}% utilisé — attention !`
                  : `${pct}% utilisé`}
              </p>
            </div>
          );
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Définir un budget mensuel">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Catégorie</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Choisir…</option>
              {unbudgeted.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Plafond mensuel (FCFA)</label>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="50000"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      </Modal>
    </div>
  );
}