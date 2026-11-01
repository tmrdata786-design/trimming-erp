import { config } from '../utils/config.js';
import type { ManagerEntity, InventoryItem, InventoryLocation, Supplier, Employee, InventoryTransfer, StockBalance, Business } from '../types/index.js';

const MANAGER_HEADERS = {
  'X-API-KEY': config.manager.apiKey,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

async function managerFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${config.manager.apiUrl}${endpoint}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...MANAGER_HEADERS,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Manager.io API error: ${response.status} ${response.statusText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export const managerApi = {
  // Business
  async getBusinesses(): Promise<Business[]> {
    return managerFetch<Business[]>('/businesses');
  },

  // Inventory Items
  async getItems(params?: { pageSize?: number; skip?: number; sortBy?: string; term?: string }): Promise<{ items: InventoryItem[]; totalRecords: number }> {
    const query = buildQuery(params || {});
    return managerFetch<{ items: InventoryItem[]; totalRecords: number }>(`/inventory-items${query}`);
  },

  async getItem(key: string): Promise<InventoryItem> {
    return managerFetch<InventoryItem>(`/inventory-items/${key}`);
  },

  // Inventory Locations
  async getLocations(params?: { pageSize?: number; skip?: number }): Promise<{ locations: InventoryLocation[]; totalRecords: number }> {
    const query = buildQuery(params || {});
    return managerFetch<{ locations: InventoryLocation[]; totalRecords: number }>(`/inventory-locations${query}`);
  },

  async getLocation(key: string): Promise<InventoryLocation> {
    return managerFetch<InventoryLocation>(`/inventory-locations/${key}`);
  },

  // Custom Inventory Locations (hierarchy)
  async getCustomInventoryLocations(): Promise<InventoryLocation[]> {
    const result = await managerFetch<{ customInventoryLocations: InventoryLocation[] }>('/custom-inventory-locations');
    return result.customInventoryLocations || [];
  },

  // Suppliers
  async getSuppliers(params?: { pageSize?: number; skip?: number; term?: string }): Promise<{ suppliers: Supplier[]; totalRecords: number }> {
    const query = buildQuery(params || {});
    return managerFetch<{ suppliers: Supplier[]; totalRecords: number }>(`/suppliers${query}`);
  },

  async getSupplier(key: string): Promise<Supplier> {
    return managerFetch<Supplier>(`/suppliers/${key}`);
  },

  // Employees (if module enabled)
  async getEmployees(params?: { pageSize?: number; skip?: number }): Promise<{ employees: Employee[]; totalRecords: number }> {
    const query = buildQuery(params || {});
    return managerFetch<{ employees: Employee[]; totalRecords: number }>(`/employees${query}`);
  },

  async getEmployee(key: string): Promise<Employee> {
    return managerFetch<Employee>(`/employees/${key}`);
  },

  // Inventory Transfers
  async getTransfers(params?: { pageSize?: number; skip?: number; fromDate?: string; toDate?: string }): Promise<{ inventoryTransfers: InventoryTransfer[]; totalRecords: number }> {
    const query = buildQuery(params || {});
    return managerFetch<{ inventoryTransfers: InventoryTransfer[]; totalRecords: number }>(`/inventory-transfers${query}`);
  },

  async getTransfer(key: string): Promise<InventoryTransfer> {
    return managerFetch<InventoryTransfer>(`/inventory-transfers/${key}`);
  },

  async createTransfer(transfer: Partial<InventoryTransfer>): Promise<InventoryTransfer> {
    return managerFetch<InventoryTransfer>('/inventory-transfers', {
      method: 'POST',
      body: JSON.stringify(transfer),
    });
  },

  // Inventory Write-offs (for adjustments)
  async createWriteOff(writeOff: any): Promise<any> {
    return managerFetch('/inventory-write-offs', {
      method: 'POST',
      body: JSON.stringify(writeOff),
    });
  },

  // Inventory Counts (for stocktaking)
  async createInventoryCount(count: any): Promise<any> {
    return managerFetch('/inventory-counts', {
      method: 'POST',
      body: JSON.stringify(count),
    });
  },

  // Stock Balances: NOT available via Manager.io API v26
  // Use Inventory Transfer report or query transactions directly.
  async getStockBalances(_params?: { itemKey?: string; locationKey?: string }): Promise<never> {
    throw new Error('Manager.io API v26 does not expose a stock balances endpoint. ' +
      'Use the Inventory Transfers report to compute current stock levels.');
  },

  // Custom Fields
  async getTextCustomFields(): Promise<any[]> {
    return managerFetch<any[]>('/text-custom-fields');
  },

  async getNumberCustomFields(): Promise<any[]> {
    return managerFetch<any[]>('/number-custom-fields');
  },

  async getCheckboxCustomFields(): Promise<any[]> {
    return managerFetch<any[]>('/checkbox-custom-fields');
  },

  async getDateCustomFields(): Promise<any[]> {
    return managerFetch<any[]>('/date-custom-fields');
  },

  // Custom Buttons
  async getCustomButtons(): Promise<any[]> {
    return managerFetch<any[]>('/custom-buttons');
  },
};

export async function testConnection(): Promise<{ ok: boolean; business?: string; error?: string }> {
  try {
    const businesses = await managerApi.getBusinesses();
    return { ok: true, business: businesses[0]?.name };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}