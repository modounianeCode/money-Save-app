import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const defaultCategories = [
  { name: "Nourriture", icon: "🍔", color: "#f97316", isIncome: false },
  { name: "Transport", icon: "🚌", color: "#06b6d4", isIncome: false },
  { name: "Logement", icon: "🏠", color: "#8b5cf6", isIncome: false },
  { name: "Loisirs", icon: "🎮", color: "#ec4899", isIncome: false },
  { name: "Santé", icon: "🏥", color: "#ef4444", isIncome: false },
  { name: "Épargne", icon: "🏦", color: "#10b981", isIncome: false },
  { name: "Autres dépenses", icon: "🛒", color: "#64748b", isIncome: false },
  { name: "Salaire", icon: "💼", color: "#22c55e", isIncome: true },
  { name: "Autres revenus", icon: "💵", color: "#84cc16", isIncome: true },
];

async function main() {
  for (const c of defaultCategories) {
    await prisma.category.upsert({
      where: { id: `${c.name}-default` },
      update: { ...c },
      create: { id: `${c.name}-default`, ...c, isDefault: true },
    });
  }

  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const password = await bcrypt.hash("demo1234", 10);
    const user = await prisma.user.create({
      data: { email: "demo@moneysave.app", name: "Utilisateur démo", password },
    });

    const cat = await prisma.category.findFirstOrThrow({
      where: { isDefault: true, isIncome: false },
    });

    const now = new Date();
    await prisma.transaction.createMany({
      data: [
        {
          userId: user.id,
          categoryId: cat.id,
          type: "EXPENSE",
          amount: 45000,
          description: "Courses de la semaine",
          date: now,
        },
      ],
    });
  }

  console.log("Seed terminé ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());