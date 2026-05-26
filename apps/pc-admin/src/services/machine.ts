import type { Machine, PaginatedResponse } from '@kinho/shared-types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api-client';

export async function getMachines(params: { keyword?: string; status?: string; customerId?: number; page?: number; pageSize?: number }): Promise<PaginatedResponse<Machine>> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.status) query.set('status', params.status);
  if (params.customerId) query.set('customerId', String(params.customerId));
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  return apiGet(`/machines?${query.toString()}`);
}

export async function createMachine(data: Omit<Machine, 'id' | 'createdAt' | 'updatedAt'>): Promise<Machine> {
  return apiPost('/machines', data);
}

export async function updateMachine(id: number, data: Partial<Omit<Machine, 'id' | 'createdAt'>>): Promise<Machine> {
  return apiPatch(`/machines/${id}`, data);
}

export async function deleteMachine(id: number): Promise<void> {
  return apiDelete(`/machines/${id}`);
}
