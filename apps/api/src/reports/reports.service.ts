import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AMOUNT_BUCKETS, FAULT_TYPE_KEYWORDS } from './report.config';

// ===================== Filter Types =====================

export interface ReportFilters {
  dateRange?: string;
  dateStart?: string;
  dateEnd?: string;
  outlet?: string;
  engineer?: string;
  status?: string;
}

// ===================== Status Colors =====================

const WORK_ORDER_STATUS_COLORS: Record<string, string> = {
  CREATED: '#3b82f6',
  ACCEPTED: '#6366f1',
  REPAIRING: '#f59e0b',
  PENDING_SIGNATURE: '#8b5cf6',
  CLOSED: '#10b981',
  CANCELLED: '#ef4444',
};

const QUOTE_STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  PENDING_SUPERVISOR: '#f59e0b',
  PENDING_PROCUREMENT: '#3b82f6',
  PENDING_CUSTOMER: '#6366f1',
  CONFIRMED: '#10b981',
  REJECTED: '#ef4444',
};

const PROCUREMENT_STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  PENDING_QUOTE: '#f59e0b',
  QUOTED: '#3b82f6',
  PENDING_APPROVAL: '#f59e0b',
  APPROVED: '#6366f1',
  ORDERED: '#3b82f6',
  PARTIALLY_RECEIVED: '#f59e0b',
  RECEIVED: '#10b981',
  REJECTED: '#ef4444',
  CANCELLED: '#6b7280',
};

// ===================== Fault Type Detection =====================

function detectFaultType(title: string): string {
  for (const [faultType, keywords] of Object.entries(FAULT_TYPE_KEYWORDS)) {
    if (keywords.some((kw) => title.includes(kw))) return faultType;
  }
  return '其他';
}

function detectMachineType(serialSnapshot: string | null | undefined): string {
  if (!serialSnapshot) return '未知';
  return serialSnapshot.split('-')[0] ?? '未知';
}

// ===================== Quote Amount Buckets =====================

function getAmountBucketLabel(amount: number): string {
  for (const bucket of AMOUNT_BUCKETS) {
    if (amount >= bucket.min && amount < bucket.max) return bucket.label;
  }
  return '>20k';
}

// ===================== Helpers =====================

function parseDateFilter(filters: ReportFilters): { gte?: Date; lte?: Date } | undefined {
  if (filters.dateRange === 'custom') {
    const range: { gte?: Date; lte?: Date } = {};
    if (filters.dateStart) range.gte = new Date(filters.dateStart);
    if (filters.dateEnd) range.lte = new Date(filters.dateEnd);
    return Object.keys(range).length > 0 ? range : undefined;
  }

  if (filters.dateRange) {
    const rangeMs: Record<string, number> = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '3m': 90 * 24 * 60 * 60 * 1000,
    };
    const ms = rangeMs[filters.dateRange];
    if (ms) {
      return { gte: new Date(Date.now() - ms) };
    }
  }

  return undefined;
}

function buildWorkOrderWhere(filters: ReportFilters): Prisma.WorkOrderWhereInput {
  const where: Prisma.WorkOrderWhereInput = {};

  const dateFilter = parseDateFilter(filters);
  if (dateFilter) {
    where.createdAt = dateFilter;
  }

  if (filters.status) {
    where.state = filters.status;
  }

  if (filters.outlet) {
    // 按网点名称过滤 — 通过 outlet 关联
    where.outlet = { name: { contains: filters.outlet } };
  }

  return where;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ===================== Work Order Report =====================

  async getWorkOrderReport(filters: ReportFilters) {
    const dateFilter = parseDateFilter(filters);

    const where: Prisma.WorkOrderWhereInput = {};
    if (dateFilter) where.createdAt = dateFilter;
    if (filters.status) where.state = filters.status;

    const items = await this.prisma.workOrder.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        state: true,
        priority: true,
        source: true,
        machineSerialSnapshot: true,
        title: true,
        createdAt: true,
        outletId: true,
      },
    });

    // Outlet distribution (outletId -> count)
    const outletCount: Record<number, number> = {};
    for (const item of items) {
      if (item.outletId != null) {
        outletCount[item.outletId] = (outletCount[item.outletId] ?? 0) + 1;
      }
    }
    const outletDistribution = Object.entries(outletCount).map(([name, value]) => ({
      name,
      value,
    }));

    // Status distribution
    const statusCount: Record<string, number> = {};
    for (const item of items) {
      statusCount[item.state] = (statusCount[item.state] ?? 0) + 1;
    }
    const statusDistribution = Object.entries(statusCount).map(([name, value]) => ({
      name,
      value,
      color: WORK_ORDER_STATUS_COLORS[name] ?? '#6b7280',
    }));

    // Priority distribution
    const priorityCount: Record<string, number> = {};
    for (const item of items) {
      priorityCount[item.priority] = (priorityCount[item.priority] ?? 0) + 1;
    }
    const priorityDistribution = Object.entries(priorityCount).map(([name, value]) => ({
      name,
      value,
    }));

    // Source distribution
    const sourceCount: Record<string, number> = {};
    for (const item of items) {
      sourceCount[item.source] = (sourceCount[item.source] ?? 0) + 1;
    }
    const sourceDistribution = Object.entries(sourceCount).map(([name, value]) => ({
      name,
      value,
    }));

    // Trend data (group by date)
    const dateCount: Record<string, number> = {};
    for (const item of items) {
      const date = item.createdAt.toISOString().slice(0, 10);
      dateCount[date] = (dateCount[date] ?? 0) + 1;
    }
    const trendData = Object.entries(dateCount)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Fault type distribution
    const faultCount: Record<string, number> = {};
    for (const item of items) {
      const faultType = detectFaultType(item.title);
      faultCount[faultType] = (faultCount[faultType] ?? 0) + 1;
    }
    const faultTypeDistribution = Object.entries(faultCount).map(([name, value]) => ({
      name,
      value,
    }));

    // Machine type distribution
    const machineCount: Record<string, number> = {};
    for (const item of items) {
      const machineType = detectMachineType(item.machineSerialSnapshot);
      machineCount[machineType] = (machineCount[machineType] ?? 0) + 1;
    }
    const machineTypeDistribution = Object.entries(machineCount).map(([name, value]) => ({
      name,
      value,
    }));

    return {
      statusDistribution,
      priorityDistribution,
      outletDistribution,
      sourceDistribution,
      trendData,
      faultTypeDistribution,
      machineTypeDistribution,
      total: items.length,
    };
  }

  // ===================== Quote Report =====================

  async getQuoteReport(filters: ReportFilters) {
    const dateFilter = parseDateFilter(filters);

    const where: Prisma.QuoteWhereInput = {};
    if (dateFilter) where.createdAt = dateFilter;
    if (filters.status) where.status = filters.status;

    const items = await this.prisma.quote.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        status: true,
        totalAmount: true,
        createdAt: true,
      },
    });

    // Status distribution
    const statusCount: Record<string, number> = {};
    for (const item of items) {
      statusCount[item.status] = (statusCount[item.status] ?? 0) + 1;
    }
    const statusDistribution = Object.entries(statusCount).map(([name, value]) => ({
      name,
      value,
      color: QUOTE_STATUS_COLORS[name] ?? '#6b7280',
    }));

    // Amount distribution
    const amountBuckets: Record<string, number> = {
      '<5k': 0,
      '5k-10k': 0,
      '10k-20k': 0,
      '>20k': 0,
    };
    for (const item of items) {
      const label = getAmountBucketLabel(Number(item.totalAmount));
      amountBuckets[label] = (amountBuckets[label] ?? 0) + 1;
    }
    const amountDistribution = Object.entries(amountBuckets).map(([name, value]) => ({
      name,
      value,
    }));

    // Trend data
    const dateData: Record<string, { count: number; amount: number }> = {};
    for (const item of items) {
      const date = item.createdAt.toISOString().slice(0, 10);
      if (!dateData[date]) dateData[date] = { count: 0, amount: 0 };
      dateData[date].count++;
      dateData[date].amount += Number(item.totalAmount);
    }
    const trendData = Object.entries(dateData)
      .map(([date, data]) => ({ date, count: data.count, amount: data.amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Approval rate: CONFIRMED / total (excluding DRAFT)
    const approvedCount = statusCount['CONFIRMED'] ?? 0;
    const nonDraftCount = items.filter((i) => i.status !== 'DRAFT').length;
    const approvalRate = nonDraftCount > 0 ? approvedCount / nonDraftCount : 0;

    const totalAmount = items.reduce((sum, item) => sum + Number(item.totalAmount), 0);
    const avgAmount = items.length > 0 ? totalAmount / items.length : 0;

    return {
      statusDistribution,
      amountDistribution,
      trendData,
      totalAmount,
      totalCount: items.length,
      avgAmount,
      approvalRate,
    };
  }

  // ===================== Procurement Report =====================

  async getProcurementReport(filters: ReportFilters) {
    const dateFilter = parseDateFilter(filters);

    const where: Prisma.ProcurementRequestWhereInput = {};
    if (dateFilter) where.createdAt = dateFilter;
    if (filters.status) where.status = filters.status;

    const items = await this.prisma.procurementRequest.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        status: true,
        estimatedCost: true,
        actualCost: true,
        createdAt: true,
        supplierId: true,
      },
    });

    // Status distribution
    const statusCount: Record<string, number> = {};
    for (const item of items) {
      statusCount[item.status] = (statusCount[item.status] ?? 0) + 1;
    }
    const statusDistribution = Object.entries(statusCount).map(([name, value]) => ({
      name,
      value,
      color: PROCUREMENT_STATUS_COLORS[name] ?? '#6b7280',
    }));

    // Cost analysis by supplier
    const costBySupplier: Record<number, { estimated: number; actual: number | null }> = {};
    for (const item of items) {
      const sid = item.supplierId;
      if (!costBySupplier[sid]) {
        costBySupplier[sid] = { estimated: 0, actual: null };
      }
      costBySupplier[sid].estimated += Number(item.estimatedCost);
      if (item.actualCost !== null) {
        costBySupplier[sid].actual = (costBySupplier[sid].actual ?? 0) + Number(item.actualCost);
      }
    }
    const costAnalysis = Object.entries(costBySupplier).map(([name, data]) => ({
      name: `Supplier ${name}`,
      estimated: data.estimated,
      actual: data.actual,
    }));

    // Supplier distribution
    const supplierCount: Record<number, number> = {};
    for (const item of items) {
      supplierCount[item.supplierId] = (supplierCount[item.supplierId] ?? 0) + 1;
    }
    const supplierDistribution = Object.entries(supplierCount).map(([name, value]) => ({
      name: `Supplier ${name}`,
      value,
    }));

    // Trend data
    const dateData: Record<string, { count: number; cost: number }> = {};
    for (const item of items) {
      const date = item.createdAt.toISOString().slice(0, 10);
      if (!dateData[date]) dateData[date] = { count: 0, cost: 0 };
      dateData[date].count++;
      dateData[date].cost += Number(item.estimatedCost);
    }
    const trendData = Object.entries(dateData)
      .map(([date, data]) => ({ date, count: data.count, cost: data.cost }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalEstimatedCost = items.reduce((sum, item) => sum + Number(item.estimatedCost), 0);
    const actualCostItems = items.filter((item) => item.actualCost !== null);
    const totalActualCost = actualCostItems.length
      ? actualCostItems.reduce((sum, item) => sum + Number(item.actualCost), 0)
      : null;

    return {
      statusDistribution,
      costAnalysis,
      supplierDistribution,
      trendData,
      totalEstimatedCost,
      totalActualCost,
      totalCount: items.length,
    };
  }

  // ===================== Inventory Report =====================

  async getInventoryReport(filters: ReportFilters) {
    const balances = await this.prisma.inventoryBalance.findMany({
      orderBy: { warehouseName: 'asc' },
    });

    // Warehouse stock summary
    const warehouseMap: Record<string, { totalParts: number; totalQuantity: number }> = {};
    for (const item of balances) {
      if (!warehouseMap[item.warehouseName]) {
        warehouseMap[item.warehouseName] = { totalParts: 0, totalQuantity: 0 };
      }
      warehouseMap[item.warehouseName].totalParts++;
      warehouseMap[item.warehouseName].totalQuantity += item.quantityOnHand;
    }
    const warehouseStock = Object.entries(warehouseMap).map(([warehouse, data]) => ({
      warehouse,
      totalParts: data.totalParts,
      totalQuantity: data.totalQuantity,
    }));

    // Low stock items (quantityAvailable < 5)
    const lowStockItems = balances
      .filter((item) => item.quantityAvailable < 5)
      .map((item) => ({
        id: item.id,
        warehouseName: item.warehouseName,
        partNo: item.partNo,
        partName: item.partName,
        partModel: item.partModel,
        quantityOnHand: item.quantityOnHand,
        quantityAvailable: item.quantityAvailable,
      }));

    // Transaction trend
    const dateFilter = parseDateFilter(filters);
    const txnWhere: Prisma.InventoryTransactionWhereInput = {};
    if (dateFilter) txnWhere.occurredAt = dateFilter;

    const transactions = await this.prisma.inventoryTransaction.findMany({
      where: txnWhere,
      orderBy: { occurredAt: 'asc' },
      select: {
        direction: true,
        quantity: true,
        occurredAt: true,
      },
    });

    const dateData: Record<string, { inCount: number; outCount: number }> = {};
    for (const txn of transactions) {
      const date = txn.occurredAt.toISOString().slice(0, 10);
      if (!dateData[date]) dateData[date] = { inCount: 0, outCount: 0 };
      if (txn.direction === 'IN') {
        dateData[date].inCount += txn.quantity;
      } else if (txn.direction === 'OUT' || txn.direction === 'TRANSFER') {
        dateData[date].outCount += txn.quantity;
      }
    }
    const transactionTrend = Object.entries(dateData)
      .map(([date, data]) => ({ date, inCount: data.inCount, outCount: data.outCount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      warehouseStock,
      lowStockItems,
      transactionTrend,
      totalSKUs: balances.length,
      totalQuantity: balances.reduce((sum, item) => sum + item.quantityOnHand, 0),
    };
  }

  // ===================== Parts Flow Report =====================

  async getPartsFlowReport(filters: ReportFilters) {
    const dateFilter = parseDateFilter(filters);

    const requestWhere: Prisma.PartsRequestWhereInput = {};
    if (dateFilter) requestWhere.createdAt = dateFilter;
    if (filters.status) requestWhere.status = filters.status;

    const returnWhere: Prisma.PartsReturnWhereInput = {};
    if (dateFilter) returnWhere.createdAt = dateFilter;

    const [requests, returns] = await Promise.all([
      this.prisma.partsRequest.findMany({
        where: requestWhere,
        orderBy: { createdAt: 'asc' },
        select: {
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.partsReturn.findMany({
        where: returnWhere,
        orderBy: { createdAt: 'asc' },
        select: {
          reason: true,
          qualityResult: true,
          createdAt: true,
        },
      }),
    ]);

    // Request status distribution
    const requestStatusCount: Record<string, number> = {};
    for (const item of requests) {
      requestStatusCount[item.status] = (requestStatusCount[item.status] ?? 0) + 1;
    }
    const requestStatusDistribution = Object.entries(requestStatusCount).map(([name, value]) => ({
      name,
      value,
    }));

    // Return reason distribution
    const returnReasonCount: Record<string, number> = {};
    for (const item of returns) {
      returnReasonCount[item.reason] = (returnReasonCount[item.reason] ?? 0) + 1;
    }
    const returnReasonDistribution = Object.entries(returnReasonCount).map(([name, value]) => ({
      name,
      value,
    }));

    // Quality result distribution
    const qualityCount: Record<string, number> = {};
    for (const item of returns) {
      if (item.qualityResult) {
        qualityCount[item.qualityResult] = (qualityCount[item.qualityResult] ?? 0) + 1;
      }
    }
    const qualityResultDistribution = Object.entries(qualityCount).map(([name, value]) => ({
      name,
      value,
      color: '#6b7280',
    }));

    // Request trend
    const dateData: Record<string, { requestCount: number; returnCount: number }> = {};
    for (const item of requests) {
      const date = item.createdAt.toISOString().slice(0, 10);
      if (!dateData[date]) dateData[date] = { requestCount: 0, returnCount: 0 };
      dateData[date].requestCount++;
    }
    for (const item of returns) {
      const date = item.createdAt.toISOString().slice(0, 10);
      if (!dateData[date]) dateData[date] = { requestCount: 0, returnCount: 0 };
      dateData[date].returnCount++;
    }
    const requestTrend = Object.entries(dateData)
      .map(([date, data]) => ({ date, requestCount: data.requestCount, returnCount: data.returnCount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalRequests = requests.length;
    const totalReturns = returns.length;

    return {
      requestStatusDistribution,
      returnReasonDistribution,
      qualityResultDistribution,
      requestTrend,
      totalRequests,
      totalReturns,
    };
  }
}
