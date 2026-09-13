import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { currentMonth, monthLabel } from "../lib/format";
import AiChatWidget from "./AiChatWidget";

const navItems = [
  { to: "/", label: "Tableau de bord", icon: "📊" },
  { to: "/transactions", label: "Transactions", icon: "💸" },
  { to: "/budgets", label: "Budgets", icon: "🎯" },
  { to: "/stats", label: "Statistiques", icon: "📈" },
  { to: "/conseils", label: "Conseils IA", icon: "🤖" },
  { to: "/categories", label: "Catégories", icon: "🗂️" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const firstName = user?.name?.split(" ")[0] || "";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {/* Navigation */}
      <aside className="lg:flex hidden flex-col fixed inset-y-0 w-[260px] bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white">
        <div className="px-5 py-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-900/40">
            💰
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">MoneySave</p>
            <p className="text-xs text-slate-400">{monthLabel(currentMonth())}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? "bg-white/10 text-white shadow-inner ring-1 ring-white/10"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center font-bold text-sm">
              {firstName.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Déconnexion"
              className="text-slate-400 hover:text-red-400 text-lg transition"
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* Header mobile */}
      <header className="lg:hidden sticky top-0 z-30 bg-slate-900 text-white shadow-lg">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <span>💰 MoneySave</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">👤 {user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20 transition"
            >
              Quitter
            </button>
          </div>
        </div>
        <nav className="px-2 pb-2 flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition ${
                  isActive ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-white/10"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Contenu */}
      <main className="lg:col-start-2 min-w-0 px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
        <Outlet />
      </main>

      <AiChatWidget />
    </div>
  );
}