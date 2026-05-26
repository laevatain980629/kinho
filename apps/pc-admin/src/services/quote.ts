import type { Quote, QuoteItem, PaginatedResponse } from '@kinho/shared-types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api-client';

export async function getQuotes(params: { keyword?: string; status?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<Quote>> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  return apiGet(`/quotes?${query.toString()}`);
}

export async function getQuoteById(id: number): Promise<(Quote & { items: QuoteItem[] }) | null> {
  return apiGet(`/quotes/${id}`);
}

export async function getQuotesByWorkOrder(workOrderId: number): Promise<Quote[]> {
  return apiGet(`/quotes?workOrderId=${workOrderId}`).then((r: any) => r.list || r);
}

export async function createQuote(data: { workOrderId: number; workOrderNo: string; laborCost: number; totalAmount: number; remark: string; createdBy: string; items: Omit<QuoteItem, 'id' | 'quoteId'>[] }): Promise<Quote> {
  return apiPost('/quotes', data);
}

export async function updateQuote(id: number, data: { workOrderId?: number; workOrderNo?: string; laborCost?: number; totalAmount?: number; remark?: string; items?: Omit<QuoteItem, 'id' | 'quoteId'>[] }): Promise<Quote> {
  return apiPatch(`/quotes/${id}`, data);
}

export async function approveQuote(id: number): Promise<Quote> {
  return apiPost(`/quotes/${id}/approve`);
}

export async function rejectQuote(id: number, reason: string): Promise<Quote> {
  return apiPost(`/quotes/${id}/reject`, { reason });
}

export async function customerConfirmQuote(id: number): Promise<Quote> {
  return apiPost(`/quotes/${id}/customer-confirm`);
}

export async function submitQuote(id: number): Promise<Quote> {
  return apiPost(`/quotes/${id}/submit`);
}

export async function sendToCustomer(id: number): Promise<Quote> {
  return apiPost(`/quotes/${id}/send-to-customer`);
}

export async function cancelQuote(id: number): Promise<Quote> {
  return apiPost(`/quotes/${id}/cancel`);
}

export async function resubmitQuote(id: number): Promise<Quote> {
  return apiPost(`/quotes/${id}/resubmit`);
}

export async function deleteQuote(id: number): Promise<void> {
  return apiDelete(`/quotes/${id}`);
}
