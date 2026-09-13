# 💰 MoneySave

Application web de gestion de budget personnel (en FCFA) : suivi des dépenses et revenus, budgets mensuels par catégorie, statistiques et alertes de dépassement.

## Stack

- **Frontend** : React + Vite + Tailwind + Recharts
- **Backend** : Node.js + Express + Prisma
- **Base de données** : PostgreSQL (via Docker Compose)

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