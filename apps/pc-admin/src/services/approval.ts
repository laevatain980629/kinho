import type { ApprovalItem, ApprovalType, PaginatedResponse } from '@kinho/shared-types';
import { apiGet, apiPost } from '../utils/api-client';

export async function getApprovals(params: { type?: ApprovalType; status?: string; tab?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<ApprovalItem>> {
  const query = new URLSearchParams();
  if (params.type) query.set('type', params.type);
  if (params.status) query.set('status', params.status);
  if (params.tab) query.set('tab', params.tab);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  return apiGet(`/approvals?${query.toString()}`);
}

export async function approveApproval(id: number, approverName: string): Promise<ApprovalItem> {
  return apiPost(`/approvals/${id}/approve`, { approverName });
}

export async function rejectApproval(id: number, approverName: string, rejectReason: string): Promise<ApprovalItem> {
  return apiPost(`/approvals/${id}/reject`, { approverName, rejectReason });
}
