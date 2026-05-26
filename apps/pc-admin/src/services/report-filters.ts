import type { WorkOrderListItem, Quote, ProcurementRequest, InventoryBalance, InventoryTransaction, PartsRequest, PartsReturn } from '@kinho/shared-types';

// ===================== Filters =====================

export interface ReportFilters {
  dateRange?: '7d' | '30d' | '3m' | 'custom';
  dateStart?: string;
  dateEnd?: string;
  outlet?: string;
  engineer?: string;
  status?: string;
}

export function inDateRange(dateStr: string, filters: ReportFilters): boolean {
  if (!filters.dateRange) return true;
  const date = new Date(dateStr);
  const now = new Date();
  let start: Date;
  if (filters.dateRange === 'custom') {
    if (filters.dateStart) {
      start = new Date(filters.dateStart);
      if (date < start) return false;
    }
    if (filters.dateEnd) {
      const end = new Date(filters.dateEnd);
      if (date > end) return false;
    }
    return true;
  }
  const rangeMs: Record<string, number> = {
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '3m': 90 * 24 * 60 * 60 * 1000,
  };
  start = new Date(now.getTime() - (rangeMs[filters.dateRange] ?? 0));
  return date >= start;
}

// ===================== Filter Helpers =====================

export function filterWorkOrders(list: WorkOrderListItem[], filters: ReportFilters): WorkOrderListItem[] {
  return list.filter((item) => {
    if (!inDateRange(item.createdAt, filters)) return false;
    if (filters.outlet && item.outletName !== filters.outlet) return false;
    if (filters.engineer && item.engineerName !== filters.engineer) return false;
    if (filters.status && item.state !== filters.status) return false;
    return true;
  });
}

export function filterQuotes(list: Quote[], filters: ReportFilters): Quote[] {
  return list.filter((item) => {
    if (!inDateRange(item.createdAt, filters)) return false;
    if (filters.status && item.status !== filters.status) return false;
    return true;
  });
}

export function filterProcurements(list: ProcurementRequest[], filters: ReportFilters): ProcurementRequest[] {
  return list.filter((item) => {
    if (!inDateRange(item.createdAt, filters)) return false;
    if (filters.status && item.status !== filters.status) return false;
    return true;
  });
}

export function filterInventory(list: InventoryBalance[], filters: ReportFilters): InventoryBalance[] {
  return list.filter((item) => {
    if (filters.outlet && item.warehouseName !== filters.outlet) return false;
    return true;
  });
}

export function filterTransactions(list: InventoryTransaction[], filters: ReportFilters): InventoryTransaction[] {
  return list.filter((item) => {
    if (!inDateRange(item.occurredAt, filters)) return false;
    return true;
  });
}

export function filterPartsRequests(list: PartsRequest[], filters: ReportFilters): PartsRequest[] {
  return list.filter((item) => {
    if (!inDateRange(item.createdAt, filters)) return false;
    if (filters.status && item.status !== filters.status) return false;
    return true;
  });
}

export function filterPartsReturns(list: PartsReturn[], filters: ReportFilters): PartsReturn[] {
  return list.filter((item) => {
    if (!inDateRange(item.createdAt, filters)) return false;
    if (filters.status && item.status !== filters.status) return false;
    return true;
  });
}
