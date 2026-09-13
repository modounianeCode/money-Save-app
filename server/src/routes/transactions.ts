import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { type, month } = req.query;

  const where: Record<string, unknown> = { userId };
  if (type === "EXPENSE" || type === "INCOME") where.type = type;
  if (month && typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
    const [year, mon] = month.split("-").map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 0, 23, 59, 59);
    where.date = { gte: start, lte: end };
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: true },
    orderBy: { date: "desc" },
    take: 200,
  });
  res.json(transactions);
});

router.post("/", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { categoryId, type, amount, description, date } = req.body || {};

  if (!categoryId || !type || amount === undefined) {
    res.status(400).json({ error: "categoryId, type et amount sont requis" });
    return;
  }
  if (type !== "EXPENSE" && type !== "INCOME") {
    res.status(400).json({ error: "type doit être EXPENSE ou INCOME" });
    return;
  }
  if (typeof amount !== "number" || amount <= 0) {
    res.status(400).json({ error: "amount doit être un nombre positif" });
    return;
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, OR: [{ isDefault: true }, { ownerId: userId }] },
  });
  if (!category) {
    res.status(400).json({ error: "Catégorie introuvable" });
    return;
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      categoryId,
      type,
      amount: Math.round(amount),
      description: description?.trim() || null,
      date: date ? new Date(date) : new Date(),
    },
    include: { category: true },
  });
  res.status(201).json(transaction);
});

router.put("/:id", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const tx = await prisma.transaction.findFirst({ where: { id: req.params.id, userId } });
  if (!tx) {
    res.status(404).json({ error: "Transaction introuvable" });
    return;
  }

  const { categoryId, type, amount, description, date } = req.body || {};

  const updated = await prisma.transaction.update({
    where: { id: tx.id },
    data: {
      categoryId: categoryId ?? tx.categoryId,
      type: type && ["EXPENSE", "INCOME"].includes(type) ? type : tx.type,
      amount: typeof amount === "number" && amount > 0 ? Math.round(amount) : tx.amount,
      description: description !== undefined ? description?.trim() || null : tx.description,
      date: date ? new Date(date) : tx.date,
    },
    include: { category: true },
  });
  res.json(updated);
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const tx = await prisma.transaction.findFirst({ where: { id: req.params.id, userId } });
  if (!tx) {
    res.status(404).json({ error: "Transaction introuvable" });
    return;
  }
  await prisma.transaction.delete({ where: { id: tx.id } });
  res.status(204).end();
});

export default router;