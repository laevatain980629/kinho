import { apiGet, apiPost } from '../utils/api-client'
import type { ProcurementRequest } from '@kinho/shared-types'

export async function getProcurements() {
  const res = await apiGet<{ list: ProcurementRequest[] }>('/procurements')
  return res.list || []
}

export async function getProcurementById(id: number) {
  return apiGet<ProcurementRequest>(`/procurements/${id}`)
}

export async function createProcurement(data: Omit<ProcurementRequest, 'id' | 'procurementNo' | 'status' | 'createdAt' | 'updatedAt'>) {
  return apiPost<ProcurementRequest>('/procurements', {
    workOrderId: data.workOrderId,
    quoteId: data.quoteId,
    supplierId: data.supplierId,
    estimatedCost: data.estimatedCost,
  })
}

export async function updateProcurementStatus(id: number) {
  return apiPost<ProcurementRequest>(`/procurements/${id}/submit-approval`)
}
