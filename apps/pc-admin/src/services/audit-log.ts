import type { AuditLog, PaginatedResponse } from '@kinho/shared-types';
import { apiGet } from '../utils/api-client';

export async function getAuditLogs(params: { keyword?: string; action?: string; module?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<AuditLog>> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.action) query.set('action', params.action);
  if (params.module) query.set('module', params.module);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  return apiGet(`/audit-logs?${query.toString()}`);
}
