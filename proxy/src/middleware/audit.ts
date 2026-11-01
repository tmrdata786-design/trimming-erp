import { query } from '../db/pool.js';
import type { Request, Response, NextFunction } from 'express';

export function auditLog(action: string, entityType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const startTime = Date.now();

    res.send = function (body?: any): Response {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Log after response is sent — use server-derived actor from JWT
      setImmediate(async () => {
        try {
          const actor = req.auth?.userEmail || 'anonymous';
          const role = req.auth?.roles?.[0] || 'unknown';
          const business = req.auth?.business || 'unknown';
          const entityId = req.params.id || req.body?.id || req.body?.key || 'unknown';
          const details = JSON.stringify({
            method: req.method,
            path: req.path,
            statusCode,
            duration,
            query: req.query,
            bodyKeys: req.body ? Object.keys(req.body) : [],
          });

          await query(
            `INSERT INTO audit_events (business, user_id, role, action, entity_type, entity_id, details, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [business, actor, role, action, entityType, entityId, details, req.ip, req.get('user-agent')]
          );
        } catch (error) {
          console.error('Audit log error:', error);
        }
      });

      return originalSend.call(this, body);
    };

    next();
  };
}

export async function logAuditEvent(
  userId: string,
  role: string,
  action: string,
  entityType: string,
  entityId: string,
  details: string,
  business = 'system'
): Promise<void> {
  await query(
    `INSERT INTO audit_events (business, user_id, role, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [business, userId, role, action, entityType, entityId, details]
  );
}