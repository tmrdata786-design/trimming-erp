import { Router } from 'express';
import { managerApi, testConnection } from '../services/managerApi.js';
import { requireAuth, optionalAuth, generateToken, rolesForAccessCode, verifyToken } from '../middleware/auth.js';
import { auditLog, logAuditEvent } from '../middleware/audit.js';
import { validate, verifyContextSchema, elevateContextSchema, createWorkOrderSchema } from '../utils/validation.js';
import { config } from '../utils/config.js';
import { query } from '../db/pool.js';
import type { Request, Response } from 'express';

const router = Router();

// Health check — no secrets disclosed
router.get('/health', async (_req: Request, res: Response) => {
  const conn = await testConnection();
  res.json({ status: conn.ok ? 'ok' : 'degraded' });
});

/**
 * AUTH FLOW (HONEST):
 * - verify-context: issues READ-ONLY bootstrap JWT (readonly_management role only).
 *   The business name from URL params CANNOT be trusted as identity proof because
 *   Manager.io Custom Buttons don't provide cryptographic launch assertions.
 * - elevate: requires a server-configured LAUNCH_ACCESS_CODE to grant privileged roles.
 *
 * When Manager.io adds verifiable signed launch assertions, replace this flow.
 */
router.post('/auth/verify-context', validate(verifyContextSchema), async (req: Request, res: Response) => {
  const { business, userEmail } = req.validated;

  // Verify business exists in Manager.io
  try {
    const businesses = await managerApi.getBusinesses();
    const biz = businesses.find((b: any) => b.name === business);
    if (!biz) {
      return res.status(404).json({ success: false, error: 'Business not found in Manager.io' });
    }

    // ISSUE READ-ONLY BOOTSTRAP TOKEN
    // No elevaton without access code — see /auth/elevate
    const bootstrapRoles: string[] = ['readonly_management'];
    const token = generateToken({
      business,
      userEmail: userEmail || 'anonymous',
      roles: bootstrapRoles,
    });

    await logAuditEvent('system', 'system', 'AUTH_VERIFY', 'Session', 'new', `Bootstrap read-only token issued for business: ${business}`);

    res.json({
      success: true,
      token,
      business,
      roles: bootstrapRoles,
      note: 'Read-only bootstrap token. Use /auth/elevate with a launch access code for privileged access.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Manager.io unavailable' });
  }
});

/**
 * Elevate to privileged roles using a shared access code.
 * The access code is configured server-side in LAUNCH_ACCESS_CODES env var.
 * Format: "code1:role1,role2;code2:role3"
 */
router.post('/auth/elevate', async (req: Request, res: Response) => {
  const { business, accessCode, userEmail } = req.body || {};

  if (!business || !accessCode) {
    return res.status(400).json({ success: false, error: 'business and accessCode required' });
  }

  const roles = rolesForAccessCode(accessCode);
  if (roles.length === 0) {
    return res.status(401).json({ success: false, error: 'Invalid or unauthorized access code' });
  }

  if (!config.allowedBusinesses.includes(business)) {
    return res.status(403).json({ success: false, error: 'Business not authorized' });
  }

  const token = generateToken({ business, userEmail: userEmail || 'operator', roles });
  await logAuditEvent(userEmail || 'anonymous', roles[0] || 'readonly_management', 'AUTH_ELEVATE', 'Session', 'elevated', `Elevated to ${roles.join(',')} for business ${business}`);
  res.json({ success: true, token, business, roles });
});

// Master Data: Items (read-only, business-scoped)
router.get('/manager/items', requireAuth('items:read'), async (req: Request, res: Response) => {
  try {
    const { pageSize = 100, skip = 0, sortBy, term } = req.query;
    const result = await managerApi.getItems({
      pageSize: Number(pageSize),
      skip: Number(skip),
      sortBy: sortBy as string,
      term: term as string,
    });

    // Cache in database (business-scoped)
    const biz = req.auth!.business;
    for (const item of result.items) {
      await query(
        `INSERT INTO master_data_cache (entity_type, manager_key, data, business) VALUES ($1, $2, $3, $4)
         ON CONFLICT (entity_type, manager_key, business) DO UPDATE SET data = $3, synced_at = NOW()`,
        ['items', item.key, JSON.stringify(item), biz]
      );
    }

    res.json({ success: true, ...result, business: biz });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch items' });
  }
});

router.get('/manager/items/:key', requireAuth('items:read'), async (req: Request, res: Response) => {
  try {
    const item = await managerApi.getItem(req.params.key);
    res.json({ success: true, data: item });
  } catch {
    res.status(404).json({ success: false, error: 'Item not found' });
  }
});

// Master Data: Locations
router.get('/manager/locations', requireAuth('locations:read'), async (_req: Request, res: Response) => {
  try {
    const result = await managerApi.getLocations({ pageSize: 200 });
    const biz = (_req as any).auth?.business || 'default';
    for (const loc of result.locations) {
      await query(
        `INSERT INTO master_data_cache (entity_type, manager_key, data, business) VALUES ($1, $2, $3, $4)
         ON CONFLICT (entity_type, manager_key, business) DO UPDATE SET data = $3, synced_at = NOW()`,
        ['locations', loc.key, JSON.stringify(loc), biz]
      );
    }
    const customLocations = await managerApi.getCustomInventoryLocations();
    for (const loc of customLocations) {
      await query(
        `INSERT INTO master_data_cache (entity_type, manager_key, data, business) VALUES ($1, $2, $3, $4)
         ON CONFLICT (entity_type, manager_key, business) DO UPDATE SET data = $3, synced_at = NOW()`,
        ['locations', loc.key, JSON.stringify(loc), biz]
      );
    }
    res.json({ success: true, ...result, customLocations, business: biz });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch locations' });
  }
});

// Master Data: Suppliers
router.get('/manager/suppliers', requireAuth('suppliers:read'), async (req: Request, res: Response) => {
  try {
    const { pageSize = 100, skip = 0, term } = req.query;
    const result = await managerApi.getSuppliers({ pageSize: Number(pageSize), skip: Number(skip), term: term as string });
    const biz = req.auth!.business;
    for (const supplier of result.suppliers) {
      await query(
        `INSERT INTO master_data_cache (entity_type, manager_key, data, business) VALUES ($1, $2, $3, $4)
         ON CONFLICT (entity_type, manager_key, business) DO UPDATE SET data = $3, synced_at = NOW()`,
        ['suppliers', supplier.key, JSON.stringify(supplier), biz]
      );
    }
    res.json({ success: true, ...result, business: biz });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch suppliers' });
  }
});

router.get('/manager/suppliers/:key', requireAuth('suppliers:read'), async (req: Request, res: Response) => {
  try {
    const supplier = await managerApi.getSupplier(req.params.key);
    res.json({ success: true, data: supplier });
  } catch {
    res.status(404).json({ success: false, error: 'Supplier not found' });
  }
});

// Master Data: Employees
router.get('/manager/employees', requireAuth('employees:read'), async (req: Request, res: Response) => {
  try {
    const { pageSize = 100, skip = 0 } = req.query;
    const result = await managerApi.getEmployees({ pageSize: Number(pageSize), skip: Number(skip) });
    const biz = req.auth!.business;
    for (const emp of result.employees) {
      await query(
        `INSERT INTO master_data_cache (entity_type, manager_key, data, business) VALUES ($1, $2, $3, $4)
         ON CONFLICT (entity_type, manager_key, business) DO UPDATE SET data = $3, synced_at = NOW()`,
        ['employees', emp.key, JSON.stringify(emp), biz]
      );
    }
    res.json({ success: true, ...result, business: biz });
  } catch (error: any) {
    // Employee module may not be enabled
    if (error.message?.includes('404')) {
      return res.json({ success: true, employees: [], totalRecords: 0, business: req.auth!.business, note: 'Employee module not enabled in Manager.io' });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch employees' });
  }
});

// Stock balances: NOT SUPPORTED via Manager.io API (no endpoint exists).
// This is a known limitation — authoritative stock is in Manager.io inventory transfers.
// The app tracks operational estimates locally; reconcile periodically with Manager.io reports.
router.get('/manager/stock-balances', requireAuth('stock:read'), async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Manager.io stock balance endpoint not available.',
    note: 'Use Inventory Transfers report or wait for backend reconciliation.',
    business: req.auth!.business,
  });
});

// Inventory Transfers (PTN) — POST gated by MANAGER_POSTING_ENABLED
router.get('/manager/inventory-transfers', requireAuth('transfers:read'), async (req: Request, res: Response) => {
  try {
    const { pageSize = 50, skip = 0, fromDate, toDate } = req.query;
    const result = await managerApi.getTransfers({
      pageSize: Number(pageSize),
      skip: Number(skip),
      fromDate: fromDate as string,
      toDate: toDate as string,
    });
    res.json({ success: true, ...result, business: req.auth!.business });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch transfers' });
  }
});

// POST gated: requires postingEnabled flag + admin/supervisor role
router.post('/manager/inventory-transfers', requireAuth('transfers:create'), async (req: Request, res: Response) => {
  if (!config.postingEnabled) {
    return res.status(403).json({ success: false, error: 'Manager.io posting is disabled. Set MANAGER_POSTING_ENABLED=true to enable.' });
  }
  try {
    const transfer = await managerApi.createTransfer(req.body);
    await logAuditEvent(req.auth!.userEmail, req.auth!.roles[0], 'CREATE_TRANSFER', 'InventoryTransfer', transfer.key, `Created transfer for ${JSON.stringify(req.body.items ?? [])}`);
    res.status(201).json({ success: true, data: transfer });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Failed to create transfer' });
  }
});

// Work Orders (app-owned, business-scoped)
router.get('/work-orders', requireAuth('workorders:read'), async (req: Request, res: Response) => {
  try {
    const biz = req.auth!.business;
    const { date, workstationId, status, workerId, limit = 50, offset = 0 } = req.query;
    let sql = 'SELECT * FROM work_orders WHERE business = $1';
    const params: any[] = [biz];
    let paramIndex = 2;

    if (date) { sql += ` AND date = $${paramIndex++}`; params.push(date); }
    if (workstationId) { sql += ` AND workstation_id = $${paramIndex++}`; params.push(workstationId); }
    if (status) { sql += ` AND status = $${paramIndex++}`; params.push(status); }
    if (workerId) { sql += ` AND assigned_worker_id = $${paramIndex++}`; params.push(workerId); }

    sql += ` ORDER BY date DESC, created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(Number(limit), Number(offset));

    const result = await query(sql, params);

    let countSql = 'SELECT COUNT(*) FROM work_orders WHERE business = $1';
    const countParams: any[] = [biz];
    let countParamIndex = 2;
    if (date) { countSql += ` AND date = $${countParamIndex++}`; countParams.push(date); }
    if (workstationId) { countSql += ` AND workstation_id = $${countParamIndex++}`; countParams.push(workstationId); }
    if (status) { countSql += ` AND status = $${countParamIndex++}`; countParams.push(status); }
    if (workerId) { countSql += ` AND assigned_worker_id = $${countParamIndex++}`; countParams.push(workerId); }

    const countResult = await query(countSql, countParams);
    res.json({ success: true, data: result.rows, totalRecords: parseInt(countResult.rows[0].count), business: biz });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch work orders' });
  }
});

router.post('/work-orders', requireAuth('workorders:create'), auditLog('CREATE_WORK_ORDER', 'WorkOrder'), validate(createWorkOrderSchema), async (req: Request, res: Response) => {
  try {
    const data = req.validated;
    const biz = req.auth!.business;
    const workOrderNumber = `WO-${new Date().toISOString().slice(0, 4)}-${String(await getNextSequence('work_order', biz)).padStart(4, '0')}`;

    const result = await query(
      `INSERT INTO work_orders (business, work_order_number, date, shift_id, workstation_id, assigned_worker_id, item_id, stage_name, source_ptn_id, quantity_issued, planned_quantity, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'scheduled')
       RETURNING *`,
      [biz, workOrderNumber, data.date, data.shiftId, data.workstationId, data.assignedWorkerId, data.itemId, data.stageName, data.sourcePtnId, data.quantityIssued, data.plannedQuantity]
    );

    await logAuditEvent(req.auth!.userEmail, req.auth!.roles[0], 'CREATE_WORK_ORDER', 'WorkOrder', result.rows[0].id, `Created ${workOrderNumber}`);
    res.status(201).json({ success: true, data: result.rows[0], business: biz });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Failed to create work order' });
  }
});

router.get('/work-orders/:id', requireAuth('workorders:read'), async (req: Request, res: Response) => {
  try {
    const biz = req.auth!.business;
    const result = await query('SELECT * FROM work_orders WHERE id = $1 AND business = $2', [req.params.id, biz]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Work order not found' });
    }
    res.json({ success: true, data: result.rows[0], business: biz });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch work order' });
  }
});

// QC Inspections (app-owned)
router.get('/qc-inspections', requireAuth('qc:read'), async (req: Request, res: Response) => {
  try {
    const biz = req.auth!.business;
    const { referenceType, referenceId, itemId, limit = 50, offset = 0 } = req.query;
    let sql = 'SELECT * FROM qc_inspections WHERE business = $1';
    const params: any[] = [biz];
    let paramIndex = 2;
    if (referenceType) { sql += ` AND reference_type = $${paramIndex++}`; params.push(referenceType); }
    if (referenceId) { sql += ` AND reference_id = $${paramIndex++}`; params.push(referenceId); }
    if (itemId) { sql += ` AND item_id = $${paramIndex++}`; params.push(itemId); }
    sql += ` ORDER BY date DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(Number(limit), Number(offset));
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows, business: biz });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch QC inspections' });
  }
});

// Placeholder routes for unimplemented features
const PLACEHOLDER_ROUTES = [
  'rework-orders', 'ogp', 'igp', 'vendor-earnings', 'vendor-payments',
  'employee-costing', 'stocktaking-sessions', 'reports'
];

for (const route of PLACEHOLDER_ROUTES) {
  router.get(`/${route}`, requireAuth('readonly_management'), (_req: Request, res: Response) => {
    res.json({ success: false, error: `Feature /${route} not yet implemented`, business: _req.auth?.business });
  });
  router.post(`/${route}`, requireAuth('readonly_management'), (_req: Request, res: Response) => {
    res.status(405).json({ success: false, error: 'Not implemented', business: _req.auth?.business });
  });
}

// Helpers
async function getNextSequence(prefix: string, biz: string): Promise<number> {
  const result = await query(
    `SELECT COUNT(*) + 1 as next FROM work_orders WHERE business = $1 AND work_order_number LIKE $2`,
    [biz, `${prefix}-${new Date().toISOString().slice(0, 4)}-%`]
  );
  return parseInt(result.rows[0].next);
}

export default router;