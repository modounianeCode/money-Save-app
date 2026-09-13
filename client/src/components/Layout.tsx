import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { currentMonth, monthLabel } from "../lib/format";
import AiChatWidget from "./AiChatWidget";

const navItems = [
  { to: "/", label: "Tableau de bord", icon: "📊" },
  { to: "/transactions", label: "Transactions", icon: "💸" },
  { to: "/budgets", label: "Budgets", icon: "🎯" },
  { to: "/stats", label: "Statistiques", icon: "📈" },
  { to: "/categories", label: "Catégories", icon: "🗂️" },
  { to: "/conseils", label: "Conseils", icon: "🤖" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-bold">
            <span>💰 MoneySave</span>
            <span className="text-slate-400 text-sm font-normal">
              · {monthLabel(currentMonth())}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">👤 {user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition"
            >
              Déconnexion
            </button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 pb-3 flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition ${
                  isActive ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800"
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
      <AiChatWidget />
    </div>
  );
}