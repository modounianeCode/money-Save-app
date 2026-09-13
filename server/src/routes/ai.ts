import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { aiChat, aiInsights, aiForecast, aiCategorize } from "../ai/agent.js";

const router = Router();
router.use(requireAuth);

router.post("/chat", async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { messages } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages est requis" });
    return;
  }

  const history = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-10);

  try {
    const result = await aiChat(userId, history);
    res.json(result);
  } catch (e) {
    console.error("AI chat error:", e);
    res.status(502).json({ error: "L'assistant IA n'a pas pu répondre. Vérifie qu'Ollama est démarré." });
  }
});

router.get("/insights", async (req: AuthRequest, res) => {
  try {
    const insights = await aiInsights(req.user!.id);
    res.json({ insights });
  } catch (e) {
    console.error("AI insights error:", e);
    res.status(502).json({ error: "Impossible de générer les conseils. Vérifie qu'Ollama est démarré." });
  }
});

router.get("/forecast", async (req: AuthRequest, res) => {
  try {
    const forecast = await aiForecast(req.user!.id);
    res.json(forecast);
  } catch (e) {
    console.error("AI forecast error:", e);
    res.status(502).json({ error: "Impossible de générer la prévision." });
  }
});

router.post("/categorize", async (req: AuthRequest, res) => {
  const { description } = req.body || {};
  if (!description?.trim()) {
    res.status(400).json({ error: "description est requis" });
    return;
  }
  try {
    const result = await aiCategorize(req.user!.id, description.trim());
    res.json({ category: result });
  } catch (e) {
    console.error("AI categorize error:", e);
    res.status(502).json({ error: "Impossible de catégoriser." });
  }
});

export default router;