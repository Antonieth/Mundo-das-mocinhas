import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { db, User } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'mundo-das-mocinhas-secret-key-2026';

export const DESIGNATED_ADMIN_EMAILS = [
  'admin@gmai.com',
  'admin@gmail.com',
  'antoniethantonio@gmail.com',
];

export function isDesignatedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return DESIGNATED_ADMIN_EMAILS.some((adm) => adm.toLowerCase() === clean);
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'client' | 'admin';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function generateToken(user: User): string {
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const str = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(str).digest('base64url');
  return `${str}.${signature}`;
}

export function verifyToken(token: string): AuthenticatedUser | null {
  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payloadB64).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  if (user) {
    req.user = user;
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticação obrigatória. Por favor inicie sessão.' });
    return;
  }
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Acesso negado. Apenas administradores têm permissão.' });
    return;
  }
  next();
}
