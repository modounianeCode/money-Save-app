# 💰 MoneySave

Application web de gestion de budget personnel (en FCFA) : suivi des dépenses et revenus, budgets mensuels par catégorie, statistiques et alertes de dépassement.

## Stack

- **Frontend** : React + Vite + Tailwind + Recharts
- **Backend** : Node.js + Express + Prisma
- **Base de données** : PostgreSQL (via Docker Compose)
- **Assistant IA** : Ollama (local) + llama3.1:8b — tout tourne sur ta machine

## Démarrage rapide

```bash
# 1. Démarre la base de données (PostgreSQL via Docker)
npm run db:up

# 2. Installe les dépendances (à la racine, workspaces npm)
npm install

# 3. Synchronise le schéma et insère les catégories par défaut
npm run dev:server --workspace server --prefix '' && cd server && npx prisma db push && npx tsx prisma/seed.ts

# 4. Lance l'application (serveur : http://localhost:4000, client : http://localhost:5173)
npm run dev
```

### Compte de démonstration

- Email : `demo@moneysave.app`
- Mot de passe : `demo1234`

## Scripts utiles

| Commande | Description |
| --- | --- |
| `npm run dev` | Lance serveur + client |
| `npm run build` | Build le frontend |
| `npm run db:up` / `db:down` | Démarre / arrête PostgreSQL |
| `npx prisma db push` (dans `server/`) | Synchronise le schéma DB |
| `npx tsx prisma/seed.ts` (dans `server/`) | Insère les données de base |

## API

Toutes les routes (sauf `auth/login` et `auth/register`) exigent un header `Authorization: Bearer <token>`.

- `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me`
- `GET|POST /api/categories` · `PUT|DELETE /api/categories/:id`
- `GET|POST /api/transactions` · `PUT|DELETE /api/transactions/:id`
- `GET|POST /api/budgets?month=YYYY-MM` · `DELETE /api/budgets/:id`
- `GET /api/stats/month` · `/by-category` · `/monthly` · `/budget-alerts`
- `POST /api/ai/chat` · `GET /api/ai/insights` · `GET /api/ai/forecast` · `POST /api/ai/categorize`

## Déploiement sur Vercel 🚀

L'appli se déploie sur Vercel : frontend statique (Vite) + API Express en fonction serverless (`api/index.ts`), et une base PostgreSQL hébergée (Neon, gratuit). **L'IA Nafi ne tourne pas sur Vercel** (Ollama est local) : les routes IA répondent un message propre « non disponible ».

### 1. Créer la base PostgreSQL distante (Neon)

1. Crée un compte sur [neon.tech](https://neon.tech) et un projet (région près de toi).
2. Copie le **connection string** (format `postgresql://...`).
3. Depuis le dépôt local, initialise le schéma + seed sur la base distante :
   ```bash
   cd server
   DATABASE_URL="postgresql://..." npx prisma db push
   DATABASE_URL="postgresql://..." npx tsx prisma/seed.ts
   ```

### 2. Créer le projet Vercel

1. Va sur [vercel.com](https://vercel.com) → **Add New Project** → importe le dépôt `money-Save-app`.
2. Vercel détecte `vercel.json` (build des fonctions + rewrite `/api/*`).
3. Paramètres du projet :
   - Remplace la commande de build par : `npm run db:generate && npm run build`
4. **Environment Variables** (Settings → Environment Variables) :
   ```
   DATABASE_URL=postgresql://... (la base Neon)
   JWT_SECRET=<un secret fort>
   AI_ENABLED=false
   ```
5. **Deploy**.

### 3. Branches et sous-domaine

- `main` = production, `modou` = preview (déploiements automatiques par push).
- Domaines : Settings → Domains, ajoute `save-money.vercel.app` (ou un domaine perso avec HTTPS automatique).

> ✅ Le CI GitHub Actions (`build.yml`) exécute `prisma generate`, le typecheck serveur et le build client sur chaque push de `main`/`modou` avant le déploiement.

## Assistant IA — Nafi 🤖

L'assistant « Nafi » tourne localement via [Ollama](https://ollama.com). Aucune donnée n'est envoyée à un service externe.

**Prérequis** : [Ollama](https://ollama.com/download) installé, puis :
```bash
ollama pull llama3.1:8b
```

**Configuration** (dans `server/.env`) :
```
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

**Fonctionnalités** :
- **Chat conversationnel** 💬 — widget flottant sur toutes les pages : dis « j'ai dépensé 5000 en transport » et Nafi l'enregistre automatiquement dans tes transactions.
- **Recommandations personnalisées** 📋 — page « Conseils » : analyse de tes habitudes, budgets en risque, suggestions d'économie.
- **Prévisions mensuelles** 🔮 — estimation des dépenses et revenus du mois prochain.
- **Catégorisation automatique** 🏷️ — décris une dépense en texte libre et Nafi identifie la bonne catégorie.

> ⚠️ Les réponses prennent entre 30 secondes et 2 minutes (modèle 8B sur CPU). Pour accélérer, passe à un modèle plus petit (`qwen2.5:3b`) ou utilise un GPU.