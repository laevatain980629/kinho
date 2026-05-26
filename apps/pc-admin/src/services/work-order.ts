import type { WorkOrderListItem, WorkOrderDetail, WorkOrderHistory, PaginatedResponse, WorkOrderListParams } from '@kinho/shared-types';
import { apiGet, apiPost } from '../utils/api-client';
import {
  buildAcceptPayload,
  buildDispatchOutletPayload,
  buildAssignEngineerPayload,
  buildConfirmFaultPayload,
  buildSubmitReceiptPayload,
} from '@kinho/workflow';

export async function getWorkOrders(
  params: WorkOrderListParams,
): Promise<PaginatedResponse<WorkOrderListItem>> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.state) query.set('state', params.state);
  if (params.outletId) query.set('outletId', String(params.outletId));
  if (params.priority) query.set('priority', params.priority);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  return apiGet(`/work-orders?${query.toString()}`);
}

export async function getWorkOrderStats(): Promise<{
  pending: number;
  repairing: number;
  pendingSignature: number;
  monthCompleted: number;
}> {
  const [pending, repairing, pendingSignature, monthCompleted] = await Promise.all([
    getWorkOrders({ page: 1, pageSize: 1, state: 'CREATED' }),
    getWorkOrders({ page: 1, pageSize: 1, state: 'REPAIRING' }),
    getWorkOrders({ page: 1, pageSize: 1, state: 'PENDING_SIGNATURE' }),
    getWorkOrders({ page: 1, pageSize: 1, state: 'CLOSED' }),
  ]);
  return {
    pending: pending.total,
    repairing: repairing.total,
    pendingSignature: pendingSignature.total,
    monthCompleted: monthCompleted.total,
  };
}

export async function getWorkOrderById(id: number): Promise<WorkOrderDetail | null> {
  return apiGet(`/work-orders/${id}`);
}

export async function getWorkOrderHistory(id: number): Promise<WorkOrderHistory[]> {
  return apiGet(`/work-orders/${id}/history`);
}

export async function createWorkOrder(form: {
  title: string; description?: string; priority: string; source: string;
  customerId?: number; machineId?: number;
  customerName: string; customerPhone: string; serviceAddress: string;
  machineModel?: string; machineSerial?: string; estimatedCost?: number;
}): Promise<WorkOrderListItem> {
  return apiPost('/work-orders', {
    title: form.title,
    description: form.description,
    priority: form.priority,
    source: form.source,
    customerId: form.customerId,
    machineId: form.machineId,
    customerNameSnapshot: form.customerName,
    customerPhoneSnapshot: form.customerPhone,
    serviceAddressSnapshot: form.serviceAddress,
    machineModelSnapshot: form.machineModel,
    machineSerialSnapshot: form.machineSerial,
    faultDesc: form.description || '待补充',
    estimatedCost: form.estimatedCost,
  });
}

// ---- Status transition functions ----

export async function signInWorkOrder(id: number): Promise<WorkOrderListItem> {
  return apiPost(`/work-orders/${id}/sign-in`);
}

export async function acceptWorkOrder(id: number, form?: Record<string, unknown>): Promise<WorkOrderListItem> {
  return apiPost(`/work-orders/${id}/accept`, buildAcceptPayload(form || {}, { workOrderId: id }));
}

// Assign engineer (Reception pool)
export async function assignWorkOrder(id: number, engineerId: number, _engineerName: string): Promise<WorkOrderListItem> {
  return apiPost(`/work-orders/${id}/assign-engineer`, buildAssignEngineerPayload({ engineerId }, { workOrderId: id }));
}

// Assign outlet: ACCEPTED → OUTLET_ASSIGNED
export async function assignOutlet(id: number, outletId: number, data?: { dispatchReason?: string; expectedArriveAt?: string }): Promise<WorkOrderListItem> {
  return apiPost(`/work-orders/${id}/assign-outlet`, buildDispatchOutletPayload({ outletId, ...data }, { workOrderId: id }));
}

// Confirm fault: SIGNED_IN → FAULT_CONFIRMED
export async function confirmFault(id: number, form?: Record<string, unknown>): Promise<WorkOrderListItem> {
  return apiPost(`/work-orders/${id}/confirm-fault`, buildConfirmFaultPayload(form || {}, { workOrderId: id }));
}

// Start repair: FAULT_CONFIRMED → REPAIRING
export async function startRepair(id: number): Promise<WorkOrderListItem> {
  return apiPost(`/work-orders/${id}/start-repair`);
}

// Submit receipt: REPAIRING → PENDING_SIGNATURE
// 已废弃：请通过 createReceipt() → POST /receipts 提交回执
export async function submitReceipt(_id: number): Promise<WorkOrderListItem> {
  throw new Error('请通过 /receipts 提交维修回执');
}

// Create RepairReceipt + advance WO state
export async function createReceipt(id: number, form: Record<string, unknown>, createdById?: number) {
  return apiPost('/receipts', { ...buildSubmitReceiptPayload(form, { workOrderId: id }), createdById });
}

// Customer sign: POST /receipts/:receiptId/customer-sign
export async function customerSign(receiptId: number, data: { customerName: string; customerPhone?: string; signatureUrl: string; signedOnDevice?: string }): Promise<WorkOrderListItem> {
  return apiPost(`/receipts/${receiptId}/customer-sign`, data);
}

// Move to follow-up: REPAIR_COMPLETED → FOLLOW_UP_PENDING
export async function moveToFollowUp(id: number): Promise<WorkOrderListItem> {
  return apiPost(`/work-orders/${id}/move-to-follow-up`);
}

// Close: FOLLOW_UP_PENDING → CLOSED
export async function closeWorkOrder(id: number): Promise<WorkOrderListItem> {
  return apiPost(`/work-orders/${id}/close`);
}

// Reopen: CLOSED → FOLLOW_UP_PENDING
export async function reopenWorkOrder(id: number): Promise<WorkOrderListItem> {
  return apiPost(`/work-orders/${id}/reopen`);
}

// Return to repair: FOLLOW_UP_PENDING → REPAIRING
export async function returnToRepairWorkOrder(id: number): Promise<WorkOrderListItem> {
  return apiPost(`/work-orders/${id}/return-to-repair`);
}

// Confirm cancel (supervisor approves cancellation request from held state)
export async function confirmCancelWorkOrder(id: number): Promise<WorkOrderListItem> {
  return apiPost(`/work-orders/${id}/confirm-cancel`);
}

// Hold: 挂起工单（不改变主状态）
export async function holdWorkOrder(id: number, reason: string): Promise<WorkOrderListItem> {
  return apiPost(`/work-orders/${id}/hold`, { reason });
}

// Unhold: 解除挂起
export async function unholdWorkOrder(id: number): Promise<WorkOrderListItem> {
  return apiPost(`/work-orders/${id}/unhold`);
}

// Cancel: any → CANCELLED
export async function cancelWorkOrder(id: number, reason: string): Promise<WorkOrderListItem> {
  return apiPost(`/work-orders/${id}/cancel`, { reason });
}
