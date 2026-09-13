import { useEffect, useState } from "react";
import { api, handleApiError } from "../lib/api";
import { formatFCFA, formatDate, toDateInput, currentMonth } from "../lib/format";
import type { Transaction, Category } from "../types";
import Modal from "../components/Modal";

interface TxForm {
  type: "EXPENSE" | "INCOME";
  categoryId: string;
  amount: string;
  description: string;
  date: string;
}

const emptyForm: TxForm = { type: "EXPENSE", categoryId: "", amount: "", description: "", date: "" };

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<"ALL" | "EXPENSE" | "INCOME">("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TxForm>(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    const qs = filter === "ALL" ? "" : `?type=${filter}`;
    api<Transaction[]>(`/transactions${qs}`).then(setTransactions).catch(console.error);
  };

  useEffect(() => {
    api<Category[]>("/categories").then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    load();
  }, [filter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setForm({
      type: tx.type,
      categoryId: tx.categoryId,
      amount: String(tx.amount),
      description: tx.description || "",
      date: toDateInput(tx.date),
    });
    setError("");
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const amount = Number(form.amount);
      if (!form.categoryId || !amount || amount <= 0) throw new Error("Choisis une catégorie et un montant valide");
      const payload = {
        type: form.type,
        categoryId: form.categoryId,
        amount,
        description: form.description || null,
        date: form.date || new Date().toISOString().slice(0, 10),
      };
      if (editing) {
        await api(`/transactions/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api("/transactions", { method: "POST", body: JSON.stringify(payload) });
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (tx: Transaction) => {
    if (!window.confirm("Supprimer cette transaction ?")) return;
    await api(`/transactions/${tx.id}`, { method: "DELETE" });
    load();
  };

  const expenseCategories = categories.filter((c) => !c.isIncome);
  const incomeCategories = categories.filter((c) => c.isIncome);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">💸 Transactions</h1>
        <button
          onClick={openCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg transition"
        >
          + Nouvelle transaction
        </button>
      </div>

      <div className="flex gap-2">
        {(["ALL", "EXPENSE", "INCOME"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f === "ALL" ? "Toutes" : f === "EXPENSE" ? "Dépenses" : "Revenus"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm">
        {transactions.length === 0 && (
          <p className="p-6 text-slate-500 text-sm">Aucune transaction trouvée.</p>
        )}
        {transactions.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 last:border-0"
          >
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
              style={{ backgroundColor: `${t.category.color}22` }}
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
              className={`font-semibold whitespace-nowrap ${
                t.type === "INCOME" ? "text-green-600" : "text-red-500"
              }`}
            >
              {t.type === "INCOME" ? "+" : "−"}{formatFCFA(t.amount)}
            </span>
            <div className="flex gap-1">
              <button onClick={() => openEdit(t)} className="text-slate-400 hover:text-indigo-600 text-sm px-2">
                ✏️
              </button>
              <button onClick={() => remove(t)} className="text-slate-400 hover:text-red-600 text-sm px-2">
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Modifier la transaction" : "Nouvelle transaction"}
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, type: "EXPENSE" })}
              className={`py-2 rounded-lg font-medium border transition ${
                form.type === "EXPENSE"
                  ? "bg-red-50 border-red-300 text-red-600"
                  : "border-slate-200 text-slate-500"
              }`}
            >
              Dépense
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, type: "INCOME" })}
              className={`py-2 rounded-lg font-medium border transition ${
                form.type === "INCOME"
                  ? "bg-green-50 border-green-300 text-green-600"
                  : "border-slate-200 text-slate-500"
              }`}
            >
              Revenu
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Catégorie</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Choisir…</option>
              {(form.type === "INCOME" ? incomeCategories : expenseCategories).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Montant (FCFA)</label>
            <input
              type="number"
              min="1"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="5000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex : Courses au marché"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
          >
            {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Ajouter"}
          </button>
        </form>
      </Modal>
    </div>
  );
}