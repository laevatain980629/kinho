import { apiGet, apiPost } from '../utils/api-client'
import type { Quote, QuoteItem } from '@kinho/shared-types'

export async function getPendingApprovals() {
  const res = await apiGet<{ list: Quote[] }>('/quotes', { status: 'PENDING_SUPERVISOR' })
  return res.list || []
}

export async function getApprovedByMe() {
  const res = await apiGet<{ list: Quote[] }>('/quotes', { status: 'CONFIRMED' })
  return res.list || []
}

export async function getApprovalById(id: number) {
  return apiGet<Quote & { items: QuoteItem[] }>(`/quotes/${id}`)
}

export async function approveQuote(id: number) {
  return apiPost<Quote>(`/quotes/${id}/approve`)
}

export async function rejectQuote(id: number) {
  return apiPost<Quote>(`/quotes/${id}/reject`)
}
