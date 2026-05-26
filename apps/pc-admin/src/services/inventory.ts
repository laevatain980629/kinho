import type { InventoryBalance, InventoryTransaction, PaginatedResponse } from '@kinho/shared-types';
import { apiGet, apiPost } from '../utils/api-client';

export async function getInventoryBalances(params: { warehouseId?: number; outletId?: number; keyword?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<InventoryBalance>> {
  const query = new URLSearchParams();
  if (params.warehouseId) query.set('warehouseId', String(params.warehouseId));
  if (params.outletId) query.set('outletId', String(params.outletId));
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  return apiGet(`/inventory/balances?${query.toString()}`);
}

export async function getInventoryTransactions(params: { warehouseId?: number; partId?: number; type?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<InventoryTransaction>> {
  const query = new URLSearchParams();
  if (params.warehouseId) query.set('warehouseId', String(params.warehouseId));
  if (params.partId) query.set('partId', String(params.partId));
  if (params.type) query.set('type', params.type);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  const res = await apiGet<PaginatedResponse<InventoryTransaction> | InventoryTransaction[]>(`/inventory/transactions?${query.toString()}`);
  if (Array.isArray(res)) {
    return { list: res, total: res.length, page: params.page || 1, pageSize: params.pageSize || res.length };
  }
  return {
    ...res,
    list: Array.isArray(res.list) ? res.list : [],
    total: typeof res.total === 'number' ? res.total : 0,
  };
}

export async function transferInventory(body: {
  fromWarehouseId: number;
  toWarehouseId: number;
  partId: number;
  quantity: number;
}) {
  return apiPost('/inventory/transfer', body);
}
