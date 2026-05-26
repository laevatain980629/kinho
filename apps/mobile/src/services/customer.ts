import { apiPost } from '../utils/api-client'

export async function submitRepairRequest(data: {
  customerName: string
  phone: string
  machineSerial: string
  faultDesc: string
  address: string
}) {
  return apiPost<{ id: number; orderNo: string }>('/customer-requests', data)
}
