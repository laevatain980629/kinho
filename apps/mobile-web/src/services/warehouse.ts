import type { Warehouse } from '@kinho/shared-types';
import { apiGet } from '@/utils/api-client';

export async function getMyWarehouses(): Promise<Warehouse[]> {
  return apiGet('/warehouses/all');
}
