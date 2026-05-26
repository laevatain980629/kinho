import type { Warehouse, PaginatedResponse } from '@kinho/shared-types';
import { apiGet, apiPost, apiPatch } from '../utils/api-client';

export async function getWarehouses(params: { keyword?: string; type?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<Warehouse>> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.type) query.set('type', params.type);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  return apiGet(`/warehouses?${query.toString()}`);
}

export async function getAllWarehouses(): Promise<Warehouse[]> {
  return apiGet('/warehouses/all');
}

export async function createWarehouse(data: Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt'>): Promise<Warehouse> {
  return apiPost('/warehouses', data);
}

export async function updateWarehouse(id: number, data: Partial<Omit<Warehouse, 'id' | 'createdAt'>>): Promise<Warehouse> {
  return apiPatch(`/warehouses/${id}`, data);
}

export async function toggleWarehouseStatus(id: number): Promise<Warehouse> {
  return apiPost(`/warehouses/${id}/toggle-status`);
}
