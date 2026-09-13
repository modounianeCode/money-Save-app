import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

router.get("/", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const month = (req.query.month as string) || currentMonth();

  const budgets = await prisma.budget.findMany({
    where: { userId, month },
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(budgets);
});

router.post("/", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { categoryId, amount, month } = req.body || {};

  if (!categoryId || typeof amount !== "number" || amount <= 0) {
    res.status(400).json({ error: "categoryId et amount (positif) sont requis" });
    return;
  }

  const budgetMonth = month || currentMonth();

  const category = await prisma.category.findFirst({
    where: { id: categoryId, isIncome: false, OR: [{ isDefault: true }, { ownerId: userId }] },
  });
  if (!category) {
    res.status(400).json({ error: "Catégorie introuvable" });
    return;
  }

  const budget = await prisma.budget.upsert({
    where: { userId_categoryId_month: { userId, categoryId, month: budgetMonth } },
    update: { amount: Math.round(amount) },
    create: { userId, categoryId, amount: Math.round(amount), month: budgetMonth },
    include: { category: true },
  });
  res.status(201).json(budget);
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const budget = await prisma.budget.findFirst({ where: { id: req.params.id, userId } });
  if (!budget) {
    res.status(404).json({ error: "Budget introuvable" });
    return;
  }
  await prisma.budget.delete({ where: { id: budget.id } });
  res.status(204).end();
});

export default router;