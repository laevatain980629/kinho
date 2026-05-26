import { apiGet, apiPost } from '../utils/api-client';

export interface CustomerRequestItem {
  id: number;
  requestNo: string;
  customerName: string;
  phone: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracy?: number | null;
  machineSerial?: string;
  machineModel?: string;
  faultDesc: string;
  status: string;
  source: string;
  createdAt: string;
}

export async function getCustomerRequests(params?: { keyword?: string; status?: string; page?: number; pageSize?: number }): Promise<{ list: CustomerRequestItem[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.keyword) query.set('keyword', params.keyword);
  if (params?.status) query.set('status', params.status);
  query.set('page', String(params?.page || 1));
  query.set('pageSize', String(params?.pageSize || 200));
  return apiGet(`/customer-requests?${query.toString()}`);
}

export async function acceptCustomerRequest(id: number, data: { customerId?: number; machineId?: number; outletId?: number; officialTitle?: string; remark?: string }): Promise<any> {
  return apiPost(`/customer-requests/${id}/accept`, data);
}

export async function rejectCustomerRequest(id: number, reason?: string): Promise<any> {
  return apiPost(`/customer-requests/${id}/reject`, { reason });
}
