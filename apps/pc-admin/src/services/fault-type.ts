import type { FaultType } from '@kinho/shared-types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api-client';

export async function getFaultTypes(): Promise<{ list: FaultType[]; total: number }> {
  return apiGet('/fault-types');
}

export async function createFaultType(data: Omit<FaultType, 'id' | 'createdAt' | 'updatedAt'>): Promise<FaultType> {
  return apiPost('/fault-types', data);
}

export async function updateFaultType(id: number, data: Partial<Omit<FaultType, 'id' | 'createdAt'>>): Promise<FaultType> {
  return apiPatch(`/fault-types/${id}`, data);
}

export async function deleteFaultType(id: number): Promise<void> {
  return apiDelete(`/fault-types/${id}`);
}

export async function toggleFaultTypeEnabled(id: number): Promise<FaultType> {
  return apiPatch(`/fault-types/${id}/toggle-enabled`);
}
