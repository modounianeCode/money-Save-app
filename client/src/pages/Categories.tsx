import { useEffect, useState } from "react";
import { api, handleApiError } from "../lib/api";
import type { Category } from "../types";
import Modal from "../components/Modal";

const ICONS = ["🍔", "🚌", "🏠", "🎮", "🏥", "🛒", "💼", "💵", "📱", "👕", "📚", "✈️", "🎁", "🐶", "⚽", "🍿", "💊", "🧾", "📁"];
const COLORS = ["#6366f1", "#f97316", "#06b6d4", "#ec4899", "#10b981", "#eab308", "#8b5cf6", "#22c55e", "#ef4444", "#14b8a6", "#f43f5e", "#84cc16"];

const emptyForm = { name: "", icon: "📁", color: COLORS[0], isIncome: false };

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => api<Category[]>("/categories").then(setCategories).catch(console.error);
  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/categories", { method: "POST", body: JSON.stringify(form) });
      setModalOpen(false);
      load();
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Category) => {
    if (c.isDefault) return;
    if (!window.confirm(`Supprimer la catégorie « ${c.name} » ?`)) return;
    try {
      await api(`/categories/${c.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      alert(handleApiError(e));
    }
  };

  const expenses = categories.filter((c) => !c.isIncome);
  const incomes = categories.filter((c) => c.isIncome);

  const renderList = (list: Category[], editable: boolean) => (
    <div className="card overflow-hidden divide-y divide-slate-100">
      {list.map((c) => (
        <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition">
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ backgroundColor: `${c.color}1f` }}
          >
            {c.icon}
          </span>
          <span className="font-medium flex-1">{c.name}</span>
          {c.isDefault && <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">prédéfinie</span>}
          {editable && (
            <button onClick={() => remove(c)} className="text-slate-400 hover:text-red-600 text-sm px-2 hover:bg-red-50 rounded-lg transition">
              🗑️
            </button>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between animate-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🗂️ Catégories</h1>
          <p className="text-sm text-slate-500">Organise tes dépenses et revenus</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          + Nouvelle catégorie
        </button>
      </div>

      <div>
        <h2 className="font-semibold text-sm text-slate-500 uppercase mb-2">Dépenses</h2>
        {renderList(expenses, true)}
      </div>
      <div>
        <h2 className="font-semibold text-sm text-slate-500 uppercase mb-2">Revenus</h2>
        {renderList(incomes, true)}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle catégorie">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nom</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="Ex : Abonnements"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[false, true].map((inc) => (
                <button
                  key={String(inc)}
                  type="button"
                  onClick={() => setForm({ ...form, isIncome: inc })}
                  className={`py-2 rounded-lg font-medium border transition ${
                    form.isIncome === inc
                      ? inc
                        ? "bg-green-50 border-green-300 text-green-600"
                        : "bg-red-50 border-red-300 text-red-600"
                      : "border-slate-200 text-slate-500"
                  }`}
                >
                  {inc ? "Revenu" : "Dépense"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Icône</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setForm({ ...form, icon: i })}
                  className={`w-9 h-9 rounded-lg text-lg transition ${
                    form.icon === i ? "bg-indigo-100 ring-2 ring-indigo-400" : "bg-slate-100 hover:bg-slate-200"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Couleur</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-8 h-8 rounded-full transition ${
                    form.color === c ? "ring-2 ring-offset-2 ring-slate-400" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full btn-primary justify-center py-3"
          >
            {saving ? "Création…" : "Créer"}
          </button>
        </form>
      </Modal>
    </div>
  );
}