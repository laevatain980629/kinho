import type { User, PaginatedResponse } from '@kinho/shared-types';
import { apiGet, apiPost, apiPatch } from '../utils/api-client';

export async function getUsers(params: { keyword?: string; role?: string; status?: string; outletId?: number; page?: number; pageSize?: number }): Promise<PaginatedResponse<User>> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.role) query.set('role', params.role);
  if (params.status) query.set('status', params.status);
  if (params.outletId) query.set('outletId', String(params.outletId));
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  return apiGet(`/users?${query.toString()}`);
}

export async function getEngineers(params: { keyword?: string; outletId?: number; status?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<User>> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.outletId) query.set('outletId', String(params.outletId));
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  return apiGet(`/users/engineers?${query.toString()}`);
}

export async function getUserById(id: number): Promise<User | null> {
  return apiGet(`/users/${id}`);
}

export async function createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>): Promise<User> {
  return apiPost('/users', data);
}

export async function updateUser(id: number, data: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User> {
  return apiPatch(`/users/${id}`, data);
}

export async function toggleUserStatus(id: number): Promise<User> {
  return apiPost(`/users/${id}/toggle-status`);
}
