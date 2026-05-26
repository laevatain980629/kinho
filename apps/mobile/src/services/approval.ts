import { apiGet, apiPost } from '../utils/api-client'
import type { ApprovalItem } from '@kinho/shared-types'

export async function getApprovals(params: { tab?: string; page?: number; pageSize?: number }) {
  return apiGet<{ list: ApprovalItem[]; total: number; page: number; pageSize: number }>('/approvals', {
    status: params.tab === 'pending' ? 'PENDING' : params.tab === 'resolved' ? 'APPROVED' : undefined,
    page: params.page,
    pageSize: params.pageSize,
  })
}

export async function approveApproval(id: number) {
  return apiPost<ApprovalItem>(`/approvals/${id}/approve`)
}

export async function rejectApproval(id: number, rejectReason: string) {
  return apiPost<ApprovalItem>(`/approvals/${id}/reject`, { rejectReason })
}
