export interface ManagerConfig {
  apiUrl: string;
  apiKey: string;
}

export interface JWTPayload {
  business: string;
  userEmail: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

export interface AuthContext {
  business: string;
  entity?: string;
  key?: string;
  userEmail?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

export interface ManagerEntity {
  key: string;
  [key: string]: unknown;
}

export interface InventoryItem extends ManagerEntity {
  code: string;
  name: string;
  unit: string;
  purchasePrice?: number;
  salesPrice?: number;
  customFields?: Record<string, unknown>;
}

export interface InventoryLocation extends ManagerEntity {
  code: string;
  name: string;
  parentLocationKey?: string;
  isActive: boolean;
}

export interface Supplier extends ManagerEntity {
  code: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  customFields?: Record<string, unknown>;
}

export interface Employee extends ManagerEntity {
  code: string;
  name: string;
  customFields?: Record<string, unknown>;
}

export interface InventoryTransfer extends ManagerEntity {
  date: string;
  reference: string;
  fromLocationKey: string;
  toLocationKey: string;
  lines: InventoryTransferLine[];
  customFields?: Record<string, unknown>;
}

export interface InventoryTransferLine {
  inventoryItemKey: string;
  qty: number;
}

export interface StockBalance {
  inventoryItemKey: string;
  locationKey: string;
  qtyOnHand: number;
}

export interface Business {
  key: string;
  name: string;
}

export type UserRole =
  | 'admin'
  | 'store_operator'
  | 'production_planner'
  | 'production_supervisor'
  | 'qc_inspector'
  | 'accounts_user'
  | 'manager_approver'
  | 'readonly_management';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['*'],
  store_operator: [
    'items:read', 'locations:read', 'suppliers:read',
    'transfers:read', 'transfers:create',
    'writeoffs:create', 'counts:create',
    'stock:read'
  ],
  production_planner: [
    'items:read', 'locations:read', 'suppliers:read', 'employees:read',
    'transfers:read', 'transfers:create',
    'workorders:read', 'workorders:create', 'workorders:update',
    'stock:read'
  ],
  production_supervisor: [
    'items:read', 'locations:read', 'suppliers:read', 'employees:read',
    'transfers:read', 'transfers:create', 'transfers:approve',
    'workorders:read', 'workorders:create', 'workorders:update', 'workorders:close',
    'stock:read'
  ],
  qc_inspector: [
    'items:read', 'locations:read',
    'qc:read', 'qc:create', 'qc:approve',
    'rework:read', 'rework:create',
    'stock:read'
  ],
  accounts_user: [
    'items:read', 'suppliers:read',
    'vendor_earnings:read', 'vendor_earnings:approve',
    'vendor_payments:read', 'vendor_payments:create',
    'employee_costing:read', 'employee_costing:create',
    'journal_entries:create'
  ],
  manager_approver: [
    'items:read', 'locations:read', 'suppliers:read', 'employees:read',
    'transfers:approve', 'writeoffs:approve', 'counts:approve',
    'vendor_earnings:approve', 'vendor_payments:approve',
    'workorders:approve', 'qc:approve', 'rework:approve',
    'stocktaking:approve'
  ],
  readonly_management: [
    'items:read', 'locations:read', 'suppliers:read', 'employees:read',
    'transfers:read', 'workorders:read', 'qc:read', 'rework:read',
    'vendor_earnings:read', 'vendor_payments:read',
    'employee_costing:read', 'stocktaking:read',
    'reports:read', 'stock:read'
  ]
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes('*') || perms.includes(permission);
}