import type { PartsReturn, PartsReturnItem, PaginatedResponse } from '@kinho/shared-types';
import { apiGet, apiPost } from '../utils/api-client';

export async function getPartsReturns(params: { keyword?: string; reason?: string; status?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<PartsReturn>> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.reason) query.set('reason', params.reason);
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  return apiGet(`/parts-returns?${query.toString()}`);
}

export async function getPartsReturnById(id: number): Promise<(PartsReturn & { items: PartsReturnItem[] }) | null> {
  return apiGet(`/parts-returns/${id}`);
}

export async function updatePartsReturnStatus(id: number, status: PartsReturn['status']): Promise<PartsReturn> {
  if (status !== 'CONFIRMED') {
    throw new Error(`Unsupported parts return status transition: ${status}`);
  }
  return apiPost(`/parts-returns/${id}/confirm`, {});
}

export async function rejectPartsReturn(id: number, _reason: string): Promise<PartsReturn> {
  return apiPost(`/parts-returns/${id}/reject`, { reason: _reason });
}
