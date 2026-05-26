import type { EscalationRequest, PaginatedResponse } from '@kinho/shared-types';
import { apiGet, apiPost } from '../utils/api-client';

export async function getEscalations(params: { workOrderId?: number; status?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<EscalationRequest>> {
  const query = new URLSearchParams();
  if (params.workOrderId) query.set('workOrderId', String(params.workOrderId));
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  return apiGet(`/escalations?${query.toString()}`);
}

export async function createEscalation(data: Omit<EscalationRequest, 'id' | 'status' | 'createdAt'>): Promise<EscalationRequest> {
  return apiPost('/escalations', data);
}

export async function approveEscalation(id: number, approverName: string): Promise<EscalationRequest> {
  return apiPost(`/escalations/${id}/approve`, { approverName });
}

export async function rejectEscalation(id: number, approverName: string): Promise<EscalationRequest> {
  return apiPost(`/escalations/${id}/reject`, { approverName });
}

export async function resolveEscalation(id: number, resolution: string, resolvedBy?: string, attachments?: { url: string; name: string; size?: number }[]): Promise<EscalationRequest> {
  return apiPost(`/escalations/${id}/resolve`, { resolution, resolvedBy, attachments });
}
