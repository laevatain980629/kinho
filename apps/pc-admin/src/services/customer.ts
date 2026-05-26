import type { Customer, PaginatedResponse } from '@kinho/shared-types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api-client';

export interface CustomerFormData {
  companyName: string;
  contactPerson: string;
  phone: string;
  address: string;
  outletId: number;
}

export async function getCustomers(params: { keyword?: string; outletId?: number; page?: number; pageSize?: number }): Promise<PaginatedResponse<Customer>> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.outletId) query.set('outletId', String(params.outletId));
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  return apiGet(`/customers?${query.toString()}`);
}

export async function getAllCustomers(): Promise<Customer[]> {
  return apiGet('/customers/all');
}

export async function createCustomer(form: CustomerFormData): Promise<Customer> {
  return apiPost('/customers', { name: form.companyName, contactName: form.contactPerson, contactPhone: form.phone, address: form.address, outletId: form.outletId });
}

export async function updateCustomer(id: number, form: CustomerFormData): Promise<Customer> {
  return apiPatch(`/customers/${id}`, { name: form.companyName, contactName: form.contactPerson, contactPhone: form.phone, address: form.address, outletId: form.outletId });
}

export async function deleteCustomer(id: number): Promise<void> {
  return apiDelete(`/customers/${id}`);
}
