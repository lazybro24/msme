import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import type { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { toAuthUser, publicUser, type AuthUser } from "./users";

export type { AuthUser, Role };
export { publicUser };

export type AuthRequest = Request & { user?: AuthUser; sessionToken?: string };

const SESSION_MS = 12 * 60 * 60 * 1000;
export const pendingMfa = new Map<string, string>();

export async function createToken(userId: string, mfaOk: boolean) {
  const token = crypto.randomBytes(24).toString("hex");
  await prisma.session.create({
    data: { token, userId, mfaOk },
  });
  return token;
}

export async function revokeToken(token: string) {
  await prisma.session.deleteMany({ where: { token } });
}

export async function getUserFromToken(token?: string | null): Promise<AuthUser | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || !session.mfaOk) return null;
  if (Date.now() - session.createdAt.getTime() > SESSION_MS) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (session.user.active === false) return null;
  return toAuthUser(session.user);
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  void getUserFromToken(token)
    .then((user) => {
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      req.user = user;
      req.sessionToken = token;
      next();
    })
    .catch(() => res.status(401).json({ error: "Unauthorized" }));
}

export function requireRoles(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const ok = roles.some((r) => req.user!.roles.includes(r));
    if (!ok) return res.status(403).json({ error: "Forbidden for this role" });
    next();
  };
}
