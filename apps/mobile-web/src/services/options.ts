import { apiGet } from '@/utils/api-client';

export interface OutletOption {
  id: number;
  name: string;
  code?: string | null;
  status?: string;
}

export interface EngineerOption {
  id: number;
  name: string;
  username?: string;
  phone?: string;
  outletId?: number | null;
}

export interface FaultTypeOption {
  id: number;
  name: string;
  code: string;
  enabled?: boolean;
  level?: number;
}

export async function getOutlets() {
  const res = await apiGet<{ list?: OutletOption[] } | OutletOption[]>('/outlets/all');
  return Array.isArray(res) ? res : res.list || [];
}

export async function getOutletEngineers(outletId: number) {
  const res = await apiGet<{ list?: EngineerOption[] } | EngineerOption[]>('/users/engineers', {
    outletId,
    status: 'ACTIVE',
    page: 1,
    pageSize: 200,
  });
  return Array.isArray(res) ? res : res.list || [];
}

export async function getFaultTypes() {
  const res = await apiGet<{ list?: FaultTypeOption[] } | FaultTypeOption[]>('/fault-types');
  return Array.isArray(res) ? res : res.list || [];
}
