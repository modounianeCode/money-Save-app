import prisma from "../lib/prisma.js";
import { ollamaChat, parseModelJson, OllamaMessage } from "./ollama.js";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export interface AiChatResult {
  message: string;
  transaction?: {
    type: "EXPENSE" | "INCOME";
    amount: number;
    categoryId: string;
    categoryName: string;
    description?: string | null;
  };
}

export interface AiInsight {
  title: string;
  detail: string;
}

async function monthRange(month: string): Promise<{ start: Date; end: Date }> {
  const [year, mon] = month.split("-").map(Number);
  return {
    start: new Date(year, mon - 1, 1),
    end: new Date(year, mon, 0, 23, 59, 59),
  };
}

async function buildFinancialContext(userId: string): Promise<string> {
  const month = currentMonth();
  const { start, end } = await monthRange(month);

  const [categories, txs, budgets, monthly] = await Promise.all([
    prisma.category.findMany({
      where: { OR: [{ isDefault: true }, { ownerId: userId }] },
      orderBy: [{ isIncome: "asc" }, { name: "asc" }],
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: start, lte: end } },
      include: { category: true },
      orderBy: { date: "desc" },
      take: 30,
    }),
    prisma.budget.findMany({ where: { userId, month }, include: { category: true } }),
    prisma.transaction.findMany({
      where: { userId },
      select: { type: true, amount: true, date: true },
      // last 6 months for trend (work in memory)
    }),
  ]);

  const expenses = txs.filter((t) => t.type === "EXPENSE");
  const incomes = txs.filter((t) => t.type === "INCOME");
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);

  const spentByCat: Record<string, number> = {};
  for (const tx of expenses) {
    spentByCat[tx.categoryId] = (spentByCat[tx.categoryId] || 0) + tx.amount;
  }

  const budgetLines = budgets
    .map((b) => {
      const spent = spentByCat[b.categoryId] || 0;
      const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
      return `- ${b.category.name} : budget ${b.amount} FCFA, dépensé ${spent} FCFA (${pct}%)`;
    })
    .join("\n");

  // monthly trend : group by YYYY-MM
  const trend: Record<string, { expenses: number; income: number }> = {};
  for (const tx of monthly) {
    const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, "0")}`;
    if (!trend[key]) trend[key] = { expenses: 0, income: 0 };
    if (tx.type === "EXPENSE") trend[key].expenses += tx.amount;
    else trend[key].income += tx.amount;
  }
  const trendLines = Object.entries(trend)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([k, v]) => `${k} : revenus ${v.income} FCFA, dépenses ${v.expenses} FCFA`)
    .join("\n");

  const expenseCategories = categories
    .filter((c) => !c.isIncome)
    .map((c) => `${c.name} (${c.id})`)
    .join(", ");
  const incomeCategories = categories
    .filter((c) => c.isIncome)
    .map((c) => `${c.name} (${c.id})`)
    .join(", ");

  const recent = txs
    .slice(0, 20)
    .map((t) => `- ${t.category.name} | ${t.type === "EXPENSE" ? "dépense" : "revenu"} | ${t.amount} FCFA | ${t.description || "sans description"}`)
    .join("\n");

  return [
    `Mois courant : ${month}`,
    `Total dépenses du mois : ${totalExpenses} FCFA`,
    `Total revenus du mois : ${totalIncome} FCFA`,
    `Solde du mois : ${totalIncome - totalExpenses} FCFA`,
    ``,
    `Budgets :`,
    budgetLines || "Aucun budget défini",
    ``,
    `Catégories de dépenses disponibles : ${expenseCategories}`,
    `Catégories de revenus disponibles : ${incomeCategories}`,
    ``,
    `Transactions récentes :`,
    recent || "Aucune transaction",
    ``,
    `Évolution mensuelle (6 derniers mois) :`,
    trendLines || "Pas assez de données",
  ].join("\n");
}

function systemChatPrompt(context: string): OllamaMessage {
  return {
    role: "system",
    content: `Tu es « Nafi », l'assistant financier personnel de MoneySave, une application de gestion de budget en Francs CFA (FCFA). Tu réponds en français, de façon chaleureuse, concise et concrète.

RÈGLE ABSOLUE : tu réponds TOUJOURS avec un objet JSON strict, sans aucun texte autour. Deux formes possibles :
- Quand l'utilisateur annonce une dépense ou un revenu avec un montant et une catégorie identifiable : {"reply":"ta confirmation","transaction":{"type":"EXPENSE" ou "INCOME","amount":montant entier en FCFA,"category":"NOM EXACT","description":"courte description"}}
- Sinon (question, conversation, information incomplète) : {"reply":"ta réponse","transaction":null}

EXEMPLES :
Utilisateur : « j'ai dépensé 5000 en transport hier » → {"reply":"C'est noté : 5000 FCFA pour le transport 🚌","transaction":{"type":"EXPENSE","amount":5000,"category":"Transport","description":"transport"}}
Utilisateur : « j'ai reçu mon salaire de 250000 » → {"reply":"Parfait, salaire de 250000 FCFA enregistré 💼","transaction":{"type":"INCOME","amount":250000,"category":"Salaire","description":"salaire"}}
Utilisateur : « où je dépense le plus ? » → {"reply":"D'après tes données...","transaction":null}
Utilisateur : « j'ai acheté je ne sais plus trop quoi » → (montant ou catégorie absent) {"reply":"Peux-tu me donner le montant et ce que tu as acheté ?","transaction":null}

CONSIGNES :
- La catégorie doit être choisie dans la liste fournie et écrite EXACTEMENT comme dans la liste (accents inclus). Si les catégories ne correspondent pas, utilise « Autres dépenses » ou « Autres revenus ».
- Le montant est un entier, valeur numérique uniquement (pas de texte).
- "reply" doit confirmer la transaction avec le montant et le nom de catégorie.
- Contexte financier de l'utilisateur :

${context}`,
  };
}

function systemInsightsPrompt(context: string): OllamaMessage {
  return {
    role: "system",
    content: `Tu es « Nafi », un conseiller financier expert pour payement sur un compte utilisateur. Analyse le contexte financier fourni et produis des conseils personnalisés en français.

CONSIGNES :
- Identifie les 3 à 5 points les plus importants : la plus grosse catégorie de dépenses, les budgets en risque ou dépassés, les tendances (hausse/baisse des dépenses), le taux d'épargne, les anomalies.
- Chaque insight est un objet {title: titre court, detail: explication concrète et actionable en 1 à 2 phrases avec des montants FCFA}.
- Reste positif et encourageant, propose une action concrète.
- Réponds UNIQUEMENT avec du JSON strict : {"insights":[{"title":"...","detail":"..."}]}

CONTEXTE FINANCIER :
${context}`,
  };
}

function systemForecastPrompt(context: string): OllamaMessage {
  return {
    role: "system",
    content: `Tu es « Nafi », spécialiste des prévisions budgétaires. À partir des données des mois précédents fournies, prédis le mois prochain pour l'utilisateur.

CONSIGNES :
- Estime le total des dépenses et des revenus du mois prochain en FCFA (entiers).
- Donne une courte justification chiffrée dans "reasoning".
- Donne un conseil d'épargne concret dans "advice".
- Réponds UNIQUEMENT avec du JSON strict : {"expenses": nombre, "income": nombre, "reasoning": "phrase", "advice": "phrase"}

CONTEXTE FINANCIER :
${context}`,
  };
}

async function categorizeWithModel(description: string, context: string): Promise<string | null> {
  const res = await ollamaChat({
    messages: [
      {
        role: "system",
        content: `Tu es un expert en catégorisation de dépenses. Classe la description d'une dépense dans la meilleure catégorie possible, choisie UNIQUEMENT dans la liste ci-dessous (nom exact) :
${context}

Réponds UNIQUEMENT avec du JSON strict : {"category":"NOM EXACT"}`,
      },
      { role: "user", content: `Description à classer : « ${description} »` },
    ],
    format: "json",
    temperature: 0,
    timeoutMs: 90000,
  });
  const parsed = parseModelJson(res.content) as { category?: string } | null;
  return parsed?.category || null;
}

export async function aiChat(userId: string, history: { role: string; content: string }[]): Promise<AiChatResult> {
  const context = await buildFinancialContext(userId);
  const messages: OllamaMessage[] = [
    systemChatPrompt(context),
    ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  const res = await ollamaChat({ messages, format: "json", numPredict: 500 });
  const parsed = parseModelJson(res.content) as {
    reply?: string;
    transaction?: { type?: string; amount?: unknown; category?: string; description?: string };
  } | null;

  if (!parsed || !parsed.reply) {
    return { message: "Pardon, je n'ai pas bien compris. Peux-tu reformuler ?" };
  }

  if (!parsed.transaction) {
    return { message: parsed.reply };
  }

  const { transaction } = parsed;
  const type = transaction.type === "INCOME" ? "INCOME" : "EXPENSE";
  const amount = Number(transaction.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { message: parsed.reply, transaction: undefined };
  }

  const categoryName = (transaction.category || "").trim();
  const category = await prisma.category.findFirst({
    where: {
      name: categoryName,
      isIncome: type === "INCOME",
      OR: [{ isDefault: true }, { ownerId: userId }],
    },
  });
  const fallback = type === "EXPENSE" ? "Autres dépenses" : "Autres revenus";
  const finalCategory =
    category ??
    (await prisma.category.findFirst({
      where: { name: fallback, isIncome: type === "INCOME", OR: [{ isDefault: true }, { ownerId: userId }] },
    }));

  const created = await prisma.transaction.create({
    data: {
      userId,
      categoryId: finalCategory?.id ?? (await prisma.category.findFirstOrThrow({ where: { isDefault: true } })).id,
      type,
      amount: Math.round(amount),
      description: transaction.description?.trim() || null,
      date: new Date(),
    },
    include: { category: true },
  });

  return {
    message: parsed.reply,
    transaction: {
      type: created.type as "EXPENSE" | "INCOME",
      amount: created.amount,
      categoryId: created.categoryId,
      categoryName: created.category.name,
      description: created.description,
    },
  };
}

export async function aiInsights(userId: string): Promise<AiInsight[]> {
  const context = await buildFinancialContext(userId);

  const budgetLines = context.match(/(?:^|\n)- .*Budget.*/gm) || [];

  const res = await ollamaChat({
    messages: [systemInsightsPrompt(context), { role: "user", content: "Analyse mes finances et donne-moi tes conseils." }],
    format: "json",
    numPredict: 1200,
    timeoutMs: 180000,
  });

  const parsed = parseModelJson(res.content) as { insights?: { title?: string; detail?: string }[] } | null;
  const insights: AiInsight[] = (parsed?.insights || [])
    .filter((i): i is { title: string; detail: string } => Boolean(i.title && i.detail))
    .slice(0, 5);

  if (budgetLines.length > 0 && insights.length === 0) {
    insights.push({
      title: "Vérifie tes budgets",
      detail: "Certains de tes budgets méritent un suivi. Rends-toi dans la page Budgets pour ajuster tes plafonds.",
    });
  }

  return insights;
}

export async function aiForecast(userId: string): Promise<{ expenses: number; income: number; reasoning: string; advice: string }> {
  const context = await buildFinancialContext(userId);
  const res = await ollamaChat({
    messages: [systemForecastPrompt(context), { role: "user", content: "Prédis mon mois prochain." }],
    format: "json",
    numPredict: 600,
    timeoutMs: 180000,
  });
  const parsed = parseModelJson(res.content) as {
    expenses?: unknown;
    income?: unknown;
    reasoning?: string;
    advice?: string;
  } | null;

  return {
    expenses: Number(parsed?.expenses) || 0,
    income: Number(parsed?.income) || 0,
    reasoning: parsed?.reasoning || "Prévision calculée d'après tes habitudes.",
    advice: parsed?.advice || "Continue de suivre tes dépenses chaque jour.",
  };
}

export async function aiCategorize(userId: string, description: string): Promise<{ categoryId: string; categoryName: string } | null> {
  const categories = await prisma.category.findMany({
    where: { isIncome: false, OR: [{ isDefault: true }, { ownerId: userId }] },
    orderBy: { name: "asc" },
  });

  const names = categories.map((c) => c.name).join(", ");
  const suggested = await categorizeWithModel(description, names);
  const matched = categories.find((c) => c.name.toLowerCase() === suggested?.toLowerCase());

  if (matched) {
    return { categoryId: matched.id, categoryName: matched.name };
  }
  const fallback = categories.find((c) => c.name === "Autres dépenses");
  if (fallback) return { categoryId: fallback.id, categoryName: fallback.name };
  return null;
}