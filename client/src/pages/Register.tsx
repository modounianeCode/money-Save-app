import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const { register, loading, error } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(name, email, password);
      navigate("/");
    } catch {
      /* erreur affichée via context */
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950 px-4">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-violet-600/30 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8 animate-in">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-3xl shadow-xl shadow-indigo-600/30 mb-4">
            💰
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Rejoins MoneySave</h1>
          <p className="text-slate-400 mt-1">Ton budget, enfin sous contrôle 🎯</p>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl animate-in-delay-1">
          <h2 className="text-xl font-bold mb-6">Créer un compte</h2>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Nom</label>
              <input
                value={name}
                required
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Ton nom"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="toi@exemple.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Mot de passe</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
              <p className="text-xs text-slate-400 mt-1">Au moins 6 caractères</p>
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-3"
            >
              {loading ? "Inscription…" : "Créer mon compte"}
            </button>
          </form>

          <p className="text-sm text-center text-slate-500 mt-6">
            Déjà inscrit ?{" "}
            <Link to="/login" className="text-indigo-600 hover:underline font-medium">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}