import type { PaginatedResponse, WorkOrderDetail, WorkOrderListItem, WorkOrderListParams } from '@kinho/shared-types';
import {
  buildAcceptPayload,
  buildConfirmFaultPayload,
  buildSubmitReceiptPayload,
} from '@kinho/workflow';
import { apiGet, apiPost } from '@/utils/api-client';

export function getWorkOrders(params: WorkOrderListParams) {
  return apiGet<PaginatedResponse<WorkOrderListItem>>('/work-orders', {
    keyword: params.keyword,
    state: params.state,
    page: params.page,
    pageSize: params.pageSize,
  });
}

export function getWorkOrderById(id: number) {
  return apiGet<WorkOrderDetail>(`/work-orders/${id}`);
}

export function acceptOrder(id: number, form?: Record<string, unknown>) {
  return apiPost<WorkOrderDetail>(`/work-orders/${id}/accept`, buildAcceptPayload(form || {}, { workOrderId: id }));
}

export function signInOrder(id: number) {
  return apiPost<WorkOrderDetail>(`/work-orders/${id}/sign-in`);
}

export function confirmFault(id: number, form?: Record<string, unknown>) {
  return apiPost<WorkOrderDetail>(`/work-orders/${id}/confirm-fault`, buildConfirmFaultPayload(form || {}, { workOrderId: id }));
}

export function startRepair(id: number) {
  return apiPost<WorkOrderDetail>(`/work-orders/${id}/start-repair`);
}

export function submitReceipt(id: number, form?: Record<string, unknown>) {
  return apiPost<WorkOrderDetail>('/receipts', { ...buildSubmitReceiptPayload(form || {}, { workOrderId: id }) });
}

export function customerSignReceipt(receiptId: number, data: {
  customerName: string;
  customerPhone?: string;
  signatureUrl: string;
  signedOnDevice?: string;
}) {
  return apiPost<WorkOrderDetail>(`/receipts/${receiptId}/customer-sign`, data);
}

export function getReceiptsByWorkOrder(workOrderId: number) {
  return apiGet<any[]>(`/receipts/work-order/${workOrderId}`);
}
