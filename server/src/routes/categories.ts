import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const categories = await prisma.category.findMany({
    where: { OR: [{ isDefault: true }, { ownerId: userId }] },
    orderBy: [{ isIncome: "asc" }, { name: "asc" }],
  });
  res.json(categories);
});

router.post("/", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { name, icon, color, isIncome } = req.body || {};

  if (!name?.trim()) {
    res.status(400).json({ error: "Un nom est requis" });
    return;
  }

  const category = await prisma.category.create({
    data: {
      name: name.trim(),
      icon: icon || "📁",
      color: color || "#6366f1",
      isIncome: Boolean(isIncome),
      ownerId: userId,
    },
  });
  res.status(201).json(category);
});

router.put("/:id", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { name, icon, color, isIncome } = req.body || {};

  const category = await prisma.category.findFirst({
    where: { id: req.params.id, OR: [{ ownerId: userId }, { isDefault: true }] },
  });
  if (!category) {
    res.status(404).json({ error: "Catégorie introuvable" });
    return;
  }

  const updated = await prisma.category.update({
    where: { id: category.id },
    data: {
      name: name?.trim() ?? category.name,
      icon: icon ?? category.icon,
      color: color ?? category.color,
      isIncome: isIncome ?? category.isIncome,
    },
  });
  res.json(updated);
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const category = await prisma.category.findFirst({
    where: { id: req.params.id, ownerId: userId },
    include: { _count: { select: { transactions: true } } },
  });
  if (!category) {
    res.status(404).json({ error: "Catégorie introuvable ou non supprimable" });
    return;
  }
  if (category._count.transactions > 0) {
    res.status(400).json({ error: "Cette catégorie contient des transactions" });
    return;
  }

  await prisma.category.delete({ where: { id: category.id } });
  res.status(204).end();
});

export default router;