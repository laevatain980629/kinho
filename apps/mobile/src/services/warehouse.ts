import { apiGet, apiPost } from '../utils/api-client'
import type { InventoryBalance, PartsRequest, PartsReturn } from '@kinho/shared-types'
import { getCurrentUser } from '../utils/current-user'

export async function getMyInventory(): Promise<InventoryBalance[]> {
  const r: any = await apiGet('/inventory/my')
  return r.list || r || []
}

export async function getMyPicks(): Promise<PartsRequest[]> {
  const r: any = await apiGet('/parts-requests')
  return r.list || r || []
}

export async function getMyReturns(): Promise<PartsReturn[]> {
  const r: any = await apiGet('/parts-returns')
  return r.list || r || []
}

export async function getPickById(id: number) {
  return apiGet<PartsRequest>(`/parts-requests/${id}`)
}

export async function getReturnById(id: number) {
  return apiGet<PartsReturn>(`/parts-returns/${id}`)
}

export async function createPick(data: {
  type: string
  workOrderId?: number
  workOrderNo?: string
  fromWarehouseId?: number
  fromWarehouseName?: string
  toWarehouseId?: number
  toWarehouseName?: string
  items: { partId?: number; partName?: string; partModel?: string; quantity: number; reservedQuantity?: number }[]
  remark?: string
}) {
  const user = getCurrentUser()
  if (data.items.some((it) => !it.partId)) {
    throw new Error('请选择有效配件')
  }
  return apiPost<PartsRequest>('/parts-requests', {
    type: data.type,
    workOrderId: data.workOrderId,
    fromWarehouseId: data.fromWarehouseId,
    toWarehouseId: data.toWarehouseId,
    items: data.items.map((it) => ({
      partId: it.partId as number,
      partNo: '',
      partName: it.partName ?? '',
      partModel: it.partModel ?? '',
      quantity: it.quantity,
    })),
    operatorId: user.id,
    operatorName: user.name || user.username,
  })
}

export async function createReturn(data: {
  workOrderId?: number
  workOrderNo?: string
  fromWarehouseId?: number
  fromWarehouseName?: string
  toWarehouseId?: number
  toWarehouseName?: string
  reason: string
  items: { partId?: number; partName?: string; partModel?: string; quantity: number }[]
  remark?: string
}) {
  if (data.items.some((it) => !it.partId)) {
    throw new Error('请选择有效配件')
  }
  return apiPost<PartsReturn>('/parts-returns', {
    workOrderId: data.workOrderId,
    fromWarehouseId: data.fromWarehouseId,
    toWarehouseId: data.toWarehouseId,
    reason: data.reason,
    items: data.items.map((it) => ({
      partId: it.partId as number,
      partNo: '',
      partName: it.partName ?? '',
      partModel: it.partModel ?? '',
      quantity: it.quantity,
    })),
  })
}

export async function confirmPickReceipt(id: number) {
  const user = getCurrentUser()
  return apiPost<PartsRequest>(`/parts-requests/${id}/receive`, {
    operatorId: user.id,
    operatorName: user.name || user.username,
  })
}
