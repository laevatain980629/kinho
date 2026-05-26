import type { PartsRequest, PartsRequestItem, PaginatedResponse } from '@kinho/shared-types';
import { apiGet, apiPost } from '../utils/api-client';

export async function getPartsRequests(params: { keyword?: string; type?: string; status?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<PartsRequest>> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.type) query.set('type', params.type);
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  return apiGet(`/parts-requests?${query.toString()}`);
}

export async function getPartsRequestById(id: number): Promise<(PartsRequest & { items: PartsRequestItem[] }) | null> {
  return apiGet(`/parts-requests/${id}`);
}

export async function approvePartsRequest(id: number, operatorId: number, operatorName: string): Promise<PartsRequest> {
  return apiPost(`/parts-requests/${id}/approve`, { operatorId, operatorName });
}

export async function rejectPartsRequest(id: number, reason: string): Promise<PartsRequest> {
  return apiPost(`/parts-requests/${id}/reject`, { reason });
}

export async function shipPartsRequest(id: number): Promise<PartsRequest> {
  return apiPost(`/parts-requests/${id}/ship`);
}

export async function receivePartsRequest(id: number, operatorId: number, operatorName: string): Promise<PartsRequest> {
  return apiPost(`/parts-requests/${id}/receive`, { operatorId, operatorName });
}

export async function cancelPartsRequest(id: number): Promise<PartsRequest> {
  return apiPost(`/parts-requests/${id}/cancel`, {});
}

export async function resubmitPartsRequest(id: number, data: {
  fromWarehouseId: number;
  toWarehouseId: number;
  items: { partId: number; partNo: string; partName: string; partModel: string; quantity: number }[];
}): Promise<PartsRequest> {
  return apiPost(`/parts-requests/${id}/resubmit`, data);
}

export async function createPartsRequest(data: Omit<PartsRequest, 'id' | 'requestNo' | 'status' | 'createdAt' | 'updatedAt'>): Promise<PartsRequest> {
  return apiPost('/parts-requests', data);
}
