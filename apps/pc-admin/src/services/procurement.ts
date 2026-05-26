import type { ProcurementRequest, PaginatedResponse } from '@kinho/shared-types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api-client';

export async function getProcurements(params: { keyword?: string; status?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<ProcurementRequest>> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  return apiGet(`/procurements?${query.toString()}`);
}

export async function getProcurementById(id: number): Promise<ProcurementRequest | null> {
  return apiGet(`/procurements/${id}`);
}

export async function createProcurement(data: Omit<ProcurementRequest, 'id' | 'procurementNo' | 'status' | 'createdAt' | 'updatedAt'>): Promise<ProcurementRequest> {
  return apiPost('/procurements', data);
}

export async function receiveProcurement(id: number): Promise<ProcurementRequest> {
  return apiPost(`/procurements/${id}/receive`);
}

export async function updateProcurement(id: number, data: Partial<Omit<ProcurementRequest, 'id' | 'createdAt'>>): Promise<ProcurementRequest> {
  return apiPatch(`/procurements/${id}`, data);
}

export async function approveProcurement(id: number): Promise<ProcurementRequest> {
  return apiPost(`/procurements/${id}/approve`);
}

export async function rejectProcurement(id: number, reason: string): Promise<ProcurementRequest> {
  return apiPost(`/procurements/${id}/reject`, { reason });
}

export async function resubmitProcurement(id: number): Promise<ProcurementRequest> {
  return apiPost(`/procurements/${id}/resubmit`);
}

export async function deleteProcurement(id: number): Promise<void> {
  return apiDelete(`/procurements/${id}`);
}
