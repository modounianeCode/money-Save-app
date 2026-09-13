import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me-in-production";

export interface AuthPayload {
  userId: string;
}

export interface AuthRequest extends Request {
  user?: { id: string };
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Non autorisé" });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(401).json({ error: "Utilisateur introuvable" });
      return;
    }
    req.user = { id: user.id };
    next();
  } catch {
    res.status(401).json({ error: "Session expirée, reconnectez-vous" });
  }
}