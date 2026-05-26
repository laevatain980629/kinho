import { apiGet, apiPost } from '../utils/api-client';

export async function getFollowUps(params?: {
  workOrderId?: number;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ list: any[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.workOrderId) query.set('workOrderId', String(params.workOrderId));
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  return apiGet(`/follow-ups?${query.toString()}`);
}

export async function createFollowUp(workOrderId: number, specialistId: number): Promise<{ id: number }> {
  return apiPost('/follow-ups', { workOrderId, specialistId });
}

export async function reportFollowUpException(id: number, data: { type: string; note: string }): Promise<any> {
  return apiPost(`/follow-ups/${id}/exception`, data);
}

export async function completeFollowUp(
  id: number,
  data: {
    contactResult: string;
    satisfaction: number;
    feedback?: string;
    needReopen?: boolean;
  },
): Promise<any> {
  return apiPost(`/follow-ups/${id}/complete`, data);
}
