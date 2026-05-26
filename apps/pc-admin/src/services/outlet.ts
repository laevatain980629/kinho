import type { Outlet, PaginatedResponse } from '@kinho/shared-types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api-client';

export async function getOutlets(params: { keyword?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<Outlet>> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  return apiGet(`/outlets?${query.toString()}`);
}

export async function getAllOutlets(): Promise<Outlet[]> {
  return apiGet('/outlets/all');
}

export async function createOutlet(data: Omit<Outlet, 'id' | 'createdAt' | 'updatedAt'>): Promise<Outlet> {
  return apiPost('/outlets', data);
}

export async function updateOutlet(id: number, data: Partial<Omit<Outlet, 'id' | 'createdAt'>>): Promise<Outlet> {
  return apiPatch(`/outlets/${id}`, data);
}

export async function deleteOutlet(id: number): Promise<void> {
  return apiDelete(`/outlets/${id}`);
}

export async function toggleOutletStatus(id: number): Promise<Outlet> {
  return apiPost(`/outlets/${id}/toggle-status`);
}
