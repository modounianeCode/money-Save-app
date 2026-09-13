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
    api<Category[]>("/categories")
      .then((c) => setCategories(c.filter((x) => !x.isIncome)))
      .catch(console.error);
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
      if (!categoryId || !value || value <= 0) {
        throw new Error("Choisis une catégorie et un montant");
      }
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

  const remove = async (b: Budget) => {
    if (!window.confirm("Supprimer ce budget ?")) return;
    await api(`/budgets/${b.id}`, { method: "DELETE" });
    load();
  };

  const budgetedIds = new Set(budgets.map((b) => b.categoryId));
  const unbudgeted = categories.filter((c) => !budgetedIds.has(c.id));

  const progressColor = (status: "exceeded" | "warning" | "mid" | "ok") => {
    switch (status) {
      case "exceeded":
        return "#ef4444";
      case "warning":
        return "#f59e0b";
      case "mid":
        return "#eab308";
      default:
        return "#22c55e";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 animate-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🎯 Budgets du mois</h1>
          <p className="text-sm text-slate-500">Définis un plafond mensuel par catégorie</p>
        </div>
        <button onClick={openCreate} disabled={unbudgeted.length === 0} className="btn-primary">
          + Définir un budget
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgets.length === 0 && (
          <p className="card col-span-full p-6 text-slate-500 text-sm">
            Aucun budget défini pour {month}. Clique sur « Définir un budget » pour commencer.
          </p>
        )}

        {budgets.map((b) => {
          const spent = spentByCat[b.categoryId] || 0;
          const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
          const status: "exceeded" | "warning" | "mid" | "ok" =
            pct >= 100 ? "exceeded" : pct >= 80 ? "warning" : pct >= 50 ? "mid" : "ok";

          return (
            <div key={b.id} className="card p-6">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${b.category.color}1f` }}
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
                  onClick={() => remove(b)}
                  className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg px-2 py-1 transition"
                >
                  🗑️
                </button>
              </div>

              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: progressColor(status) }}
                />
              </div>

              <p
                className={`text-sm mt-2 font-medium ${
                  status === "exceeded"
                    ? "text-red-600"
                    : status === "warning"
                    ? "text-amber-600"
                    : "text-slate-500"
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
              className="input"
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
              className="input"
              placeholder="50000"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving} className="w-full btn-primary justify-center py-3">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </form>
      </Modal>
    </div>
  );
}