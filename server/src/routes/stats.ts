import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

router.get("/month", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const month = (req.query.month as string) || currentMonth();
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 0, 23, 59, 59);

  const transactions = await prisma.transaction.findMany({
    where: { userId, date: { gte: start, lte: end } },
    include: { category: true },
  });

  const totalExpenses = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amount, 0);

  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + t.amount, 0);

  res.json({ month, totalExpenses, totalIncome, balance: totalIncome - totalExpenses });
});

router.get("/by-category", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const month = (req.query.month as string) || currentMonth();
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 0, 23, 59, 59);

  const transactions = await prisma.transaction.findMany({
    where: { userId, date: { gte: start, lte: end }, type: "EXPENSE" },
    include: { category: true },
  });

  const grouped: Record<string, { name: string; icon: string; color: string; total: number }> = {};
  for (const tx of transactions) {
    const catId = tx.categoryId;
    if (!grouped[catId]) {
      grouped[catId] = { name: tx.category.name, icon: tx.category.icon, color: tx.category.color, total: 0 };
    }
    grouped[catId].total += tx.amount;
  }

  const result = Object.values(grouped).sort((a, b) => b.total - a.total);
  res.json(result);
});

router.get("/monthly", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const count = Math.min(Number(req.query.count) || 6, 24);
  const now = new Date();
  const months: string[] = [];

  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.unshift(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const results = await Promise.all(
    months.map(async (m) => {
      const [year, mon] = m.split("-").map(Number);
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 0, 23, 59, 59);

      const txs = await prisma.transaction.findMany({
        where: { userId, date: { gte: start, lte: end } },
      });

      const expenses = txs.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
      const income = txs.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);

      return { month: m, expenses, income, balance: income - expenses };
    })
  );

  res.json(results);
});

router.get("/budget-alerts", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const month = (req.query.month as string) || currentMonth();
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 0, 23, 59, 59);

  const budgets = await prisma.budget.findMany({
    where: { userId, month },
    include: { category: true },
  });

  const transactions = await prisma.transaction.findMany({
    where: { userId, type: "EXPENSE", date: { gte: start, lte: end } },
  });

  const spentByCategory: Record<string, number> = {};
  for (const tx of transactions) {
    spentByCategory[tx.categoryId] = (spentByCategory[tx.categoryId] || 0) + tx.amount;
  }

  const alerts = budgets.map((b) => {
    const spent = spentByCategory[b.categoryId] || 0;
    const percentage = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
    return {
      budgetId: b.id,
      category: { id: b.category.id, name: b.category.name, icon: b.category.icon, color: b.category.color },
      budgetAmount: b.amount,
      spent,
      percentage,
      status: percentage >= 100 ? "exceeded" : percentage >= 80 ? "warning" : "ok",
    };
  });

  res.json(alerts.filter((a) => a.status !== "ok"));
});

export default router;