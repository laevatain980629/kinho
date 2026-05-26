import { apiGet, apiPost } from '../utils/api-client'
import {
  buildAcceptPayload,
  buildDispatchOutletPayload,
  buildAssignEngineerPayload,
  buildConfirmFaultPayload,
  buildSubmitReceiptPayload,
} from '@kinho/workflow';
import type { WorkOrderListItem, PaginatedResponse, WorkOrderListParams } from '@kinho/shared-types'

export interface CreateWorkOrderPayload {
  title: string
  priority: 'NORMAL' | 'URGENT' | 'CRITICAL'
  source: 'CUSTOMER_H5' | 'PHONE' | 'PC' | 'OTHER'
  customerNameSnapshot: string
  customerPhoneSnapshot: string
  serviceAddressSnapshot: string
  faultDesc: string
  customerId?: number
  machineId?: number
  machineSerialSnapshot?: string
  machineModelSnapshot?: string
  estimatedCost?: number
}

export async function getWorkOrders(
  params: WorkOrderListParams,
): Promise<PaginatedResponse<WorkOrderListItem>> {
  return apiGet('/work-orders', {
    keyword: params.keyword,
    state: params.state,
    page: params.page,
    pageSize: params.pageSize,
  })
}

export async function getWorkOrderById(id: number): Promise<any> {
  return apiGet(`/work-orders/${id}`)
}

export async function createWorkOrder(data: CreateWorkOrderPayload): Promise<any> {
  return apiPost('/work-orders', data)
}

export async function acceptOrder(id: number, form?: Record<string, unknown>) {
  return apiPost(`/work-orders/${id}/accept`, buildAcceptPayload(form || {}, { workOrderId: id }))
}

export async function rejectOrder(id: number, reason: string) {
  return apiPost(`/work-orders/${id}/cancel`, { reason })
}

export async function signIn(id: number) {
  return apiPost(`/work-orders/${id}/sign-in`)
}

export async function confirmFault(id: number, form?: Record<string, unknown>) {
  return apiPost(`/work-orders/${id}/confirm-fault`, buildConfirmFaultPayload(form || {}, { workOrderId: id }))
}

export async function startRepair(id: number) {
  return apiPost(`/work-orders/${id}/start-repair`)
}

// 已废弃：请通过 createReceipt() → POST /receipts 提交回执
export async function submitReceipt(_id: number, _data?: any) {
  throw new Error('请通过 /receipts 提交维修回执')
}

export async function createReceipt(workOrderId: number, form: Record<string, unknown>, createdById?: number) {
  return apiPost('/receipts', { ...buildSubmitReceiptPayload(form, { workOrderId }), createdById })
}

export async function customerSignReceipt(receiptId: number, data: {
  customerName: string;
  customerPhone?: string;
  signatureUrl: string;
  signedOnDevice?: string;
}) {
  return apiPost(`/receipts/${receiptId}/customer-sign`, data)
}

// 已废弃：请通过 customerSignReceipt() → POST /receipts/:id/customer-sign 完成签字
export async function customerSign(_id: number) {
  throw new Error('请通过 /receipts/:id/customer-sign 完成客户签字')
}

export async function getReceiptsByWorkOrder(workOrderId: number) {
  return apiGet(`/receipts/work-order/${workOrderId}`)
}

export async function escalate(id: number, reason: string) {
  return apiPost(`/escalations`, { workOrderId: id, reason })
}

export async function approveEscalation(id: number) {
  return apiPost(`/escalations/${id}/approve`)
}

export async function getEscalations(workOrderId: number) {
  const res = await apiGet<{ list: any[] }>('/escalations', { workOrderId })
  return res.list || []
}

export async function resolveEscalation(id: number, resolution: string, attachments?: { url: string; name: string; size?: number }[]) {
  return apiPost(`/escalations/${id}/resolve`, { resolution, attachments })
}

export async function assignOutlet(id: number, outletId: number, data?: { dispatchReason?: string; expectedArriveAt?: string }) {
  return apiPost(`/work-orders/${id}/assign-outlet`, buildDispatchOutletPayload({ outletId, ...data }, { workOrderId: id }))
}

export async function assignEngineer(id: number, engineerId: number) {
  return apiPost(`/work-orders/${id}/assign-engineer`, buildAssignEngineerPayload({ engineerId }, { workOrderId: id }))
}

export async function closeOrder(id: number) {
  return apiPost(`/work-orders/${id}/close`)
}

export async function completeFollowUp(workOrderId: number) {
  // Find the follow-up record for this work order, then complete it
  const data = await apiGet<{ list: Array<{ id: number }> }>('/follow-ups')
  const fu = (data.list || []).find((f: any) => f.workOrderId === workOrderId)
  if (!fu) throw new Error('未找到回访记录')
  return apiPost(`/follow-ups/${fu.id}/complete`, { contactResult: '已电话回访确认完成', satisfaction: 5 })
}

export async function getOutlets(): Promise<any[]> {
  return apiGet('/outlets/all')
}

export async function getOutletEngineers(outletId: number): Promise<any[]> {
  const res = await apiGet<{ list: any[] }>('/users', { role: 'engineer', outletId, status: 'ACTIVE' })
  return res.list || []
}

export async function holdWorkOrder(id: number, reason: string) {
  return apiPost(`/work-orders/${id}/hold`, { reason })
}

export async function unholdWorkOrder(id: number) {
  return apiPost(`/work-orders/${id}/unhold`)
}

export async function cancelWorkOrder(id: number) {
  return apiPost(`/work-orders/${id}/cancel`)
}

export async function reopenWorkOrder(id: number) {
  return apiPost(`/work-orders/${id}/reopen`)
}

export async function returnToRepairWorkOrder(id: number) {
  return apiPost(`/work-orders/${id}/return-to-repair`)
}
