// Frontend API client for Manager.io Proxy
import type { UserRole } from '../types/index.js';

// Manager.io API Response Types
interface ManagerIoItem {
  key: string;
  code: string;
  name: string;
  unit: string;
  purchasePrice?: number;
  salesPrice?: number;
  customFields?: Record<string, unknown>;
}

interface ManagerIoLocation {
  key: string;
  code: string;
  name: string;
  parentLocationKey?: string;
  isActive: boolean;
}

interface ManagerIoSupplier {
  key: string;
  code: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  customFields?: Record<string, unknown>;
}

interface ManagerIoEmployee {
  key: string;
  code: string;
  name: string;
  customFields?: Record<string, unknown>;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

interface AuthTokens {
  token: string;
  business: string;
  roles: UserRole[];
}

let authTokens: AuthTokens | null = null;

export function setAuth(tokens: AuthTokens): void {
  authTokens = tokens;
  localStorage.setItem('trimming_erp_auth', JSON.stringify(tokens));
}

export function getAuth(): AuthTokens | null {
  if (authTokens) return authTokens;
  const stored = localStorage.getItem('trimming_erp_auth');
  if (stored) {
    try {
      authTokens = JSON.parse(stored);
      return authTokens;
    } catch {
      return null;
    }
  }
  return null;
}

export function clearAuth(): void {
  authTokens = null;
  localStorage.removeItem('trimming_erp_auth');
}

export function isAuthenticated(): boolean {
  return getAuth() !== null;
}

// Manager.io Custom Button launch context.
// Manager passes context as query string params: business, entity, key, userEmail.
export interface LaunchContext {
  business?: string;
  entity?: string;
  key?: string;
  userEmail?: string;
}

export function readLaunchContext(search: string = window.location.search): LaunchContext {
  const params = new URLSearchParams(search);
  const pick = (...names: string[]): string | undefined => {
    for (const name of names) {
      const value = params.get(name);
      if (value) return value;
    }
    return undefined;
  };
  return {
    business: pick('business', 'Business', 'businessName'),
    entity: pick('entity', 'Entity', 'placement'),
    key: pick('key', 'Key', 'id'),
    userEmail: pick('userEmail', 'user', 'email'),
  };
}

/**
 * Bootstrap a read-only session from the Custom Button launch context.
 * Silently no-ops when no context is present or the proxy is unreachable,
 * so the app keeps working on local data.
 */
export async function bootstrapFromLaunch(): Promise<void> {
  const ctx = readLaunchContext();
  if (!ctx.business) return;
  const existing = getAuth();
  if (existing && existing.business === ctx.business) return;
  try {
    await verifyContext(ctx as { business: string; entity?: string; key?: string; userEmail?: string });
  } catch {
    // Proxy unavailable or business rejected — stay in local-data mode.
  }
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const auth = getAuth();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (auth) {
    headers['Authorization'] = `Bearer ${auth.token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Session expired/invalid. Do NOT hard-redirect: the app is served under a
      // sub-path (e.g. /trimming-erp/) and runs on local data. Just drop the stale
      // token so the next launch re-authenticates.
      clearAuth();
    }
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Master Data
export const managerApi = {
  async getItems(params?: { pageSize?: number; skip?: number; term?: string }) {
    const query = new URLSearchParams();
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.skip) query.set('skip', String(params.skip));
    if (params?.term) query.set('term', params.term);
    return apiFetch<{ items: ManagerIoItem[]; totalRecords: number }>(`/manager/items?${query}`);
  },

  async getItem(key: string) {
    return apiFetch<{ data: ManagerIoItem }>(`/manager/items/${key}`);
  },

  async getLocations(params?: { pageSize?: number; skip?: number }) {
    const query = new URLSearchParams();
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.skip) query.set('skip', String(params.skip));
    return apiFetch<{ locations: ManagerIoLocation[]; totalRecords: number; customLocations: ManagerIoLocation[] }>(`/manager/locations?${query}`);
  },

  async getSuppliers(params?: { pageSize?: number; skip?: number; term?: string }) {
    const query = new URLSearchParams();
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.skip) query.set('skip', String(params.skip));
    if (params?.term) query.set('term', params.term);
    return apiFetch<{ suppliers: ManagerIoSupplier[]; totalRecords: number }>(`/manager/suppliers?${query}`);
  },

  async getSupplier(key: string) {
    return apiFetch<{ data: ManagerIoSupplier }>(`/manager/suppliers/${key}`);
  },

  async getEmployees(params?: { pageSize?: number; skip?: number }) {
    const query = new URLSearchParams();
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.skip) query.set('skip', String(params.skip));
    return apiFetch<{ employees: ManagerIoEmployee[]; totalRecords: number }>(`/manager/employees?${query}`);
  },

  async getStockBalances(params?: { itemKey?: string; locationKey?: string }) {
    const query = new URLSearchParams();
    if (params?.itemKey) query.set('itemKey', params.itemKey);
    if (params?.locationKey) query.set('locationKey', params.locationKey);
    return apiFetch<{ data: any[] }>(`/manager/stock-balances?${query}`);
  },

  async createTransfer(transfer: any) {
    return apiFetch<{ data: any }>('/manager/inventory-transfers', {
      method: 'POST',
      body: JSON.stringify(transfer),
    });
  },
};

// Work Orders
export const workOrderApi = {
  async list(params?: { date?: string; workstationId?: string; status?: string; workerId?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (params?.date) query.set('date', params.date);
    if (params?.workstationId) query.set('workstationId', params.workstationId);
    if (params?.status) query.set('status', params.status);
    if (params?.workerId) query.set('workerId', params.workerId);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    return apiFetch<{ data: any[]; totalRecords: number }>(`/work-orders?${query}`);
  },

  async get(id: string) {
    return apiFetch<{ data: any }>(`/work-orders/${id}`);
  },

  async create(data: any) {
    return apiFetch<{ data: any }>('/work-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: any) {
    return apiFetch<{ data: any }>(`/work-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async close(id: string, data: any) {
    return apiFetch<{ data: any }>(`/work-orders/${id}/close`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// QC Inspections
export const qcApi = {
  async list(params?: { referenceType?: string; referenceId?: string; itemId?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (params?.referenceType) query.set('referenceType', params.referenceType);
    if (params?.referenceId) query.set('referenceId', params.referenceId);
    if (params?.itemId) query.set('itemId', params.itemId);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    return apiFetch<{ data: any[] }>(`/qc-inspections?${query}`);
  },

  async create(data: any) {
    return apiFetch<{ data: any }>('/qc-inspections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Auth
export async function verifyContext(context: { business: string; entity?: string; key?: string; userEmail?: string }) {
  const response = await fetch(`${API_BASE}/auth/verify-context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Authentication failed' }));
    throw new Error(error.error || 'Failed to verify context');
  }

  const data = await response.json();
  setAuth({ token: data.token, business: data.business, roles: data.roles });
  return data;
}

export function getConnectionStatus(): 'unknown' | 'connected' | 'disconnected' | 'error' {
  const auth = getAuth();
  if (!auth) return 'unknown';
  // Could add a ping endpoint to verify
  return 'connected';
}