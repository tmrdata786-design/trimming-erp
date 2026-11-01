import jwt from 'jsonwebtoken';
import { config } from '../utils/config.js';
import type { JWTPayload, UserRole } from '../types/index.js';
import type { SignOptions } from 'jsonwebtoken';
import { ROLE_PERMISSIONS } from '../types/index.js';

export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const options: SignOptions = { expiresIn: config.jwt.expiresIn as any };
  return jwt.sign(payload, config.jwt.secret, options);
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const verifyOpts: jwt.VerifyOptions = {};
    if (config.jwt.issuer) verifyOpts.issuer = config.jwt.issuer;
    if (config.jwt.audience) verifyOpts.audience = config.jwt.audience;
    return jwt.verify(token, config.jwt.secret, verifyOpts) as JWTPayload;
  } catch {
    return null;
  }
}

export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

/**
 * ROLE HIERARCHY: ordered by privilege level (index increases with privilege)
 */
export const ROLE_PRIVILEGE_ORDER: Record<UserRole, number> = {
  readonly_management: 0,
  store_operator: 1,
  accounts_user: 2,
  production_planner: 3,
  production_supervisor: 4,
  qc_inspector: 5,
  manager_approver: 6,
  admin: 7,
};

export function hasPermission(roles: UserRole[], permission: string): boolean {
  for (const role of roles) {
    const perms = ROLE_PERMISSIONS[role] || [];
    if (perms.includes('*') || perms.includes(permission)) return true;
  }
  return false;
}

/**
 * Returns roles based on access code. Only returns roles the code is configured for.
 * If no code matches, returns empty array (anonymous).
 */
export function rolesForAccessCode(code: string): UserRole[] {
  if (!config.launchAccessCodes) return [];
  const mapped = config.launchAccessCodes[code] || [];
  return mapped.filter((r): r is UserRole => typeof r === 'string' && Object.keys(ROLE_PRIVILEGE_ORDER).includes(r));
}

export function requireAuth(requiredPermission?: string) {
  return (req: any, res: any, next: any) => {
    const token = extractToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
    if (!config.allowedBusinesses.includes(payload.business)) {
      return res.status(403).json({ success: false, error: 'Business not authorized' });
    }
    if (requiredPermission && !hasPermission(payload.roles as UserRole[], requiredPermission)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    req.auth = payload;
    next();
  };
}

export function optionalAuth(req: any, res: any, next: any) {
  const token = extractToken(req.headers.authorization);
  if (token) {
    const payload = verifyToken(token);
    if (payload && config.allowedBusinesses.includes(payload.business)) {
      req.auth = payload;
    }
  }
  next();
}