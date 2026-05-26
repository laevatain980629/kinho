import type { WorkOrderListItem, Quote, ProcurementRequest, InventoryBalance, InventoryTransaction, PartsRequest, PartsReturn, QualityResult } from '@kinho/shared-types';
import { RETURN_REASON_LABELS, QUALITY_RESULT_COLORS } from '@kinho/shared-types';
import type { PaginatedResponse } from '@kinho/shared-types';
import { apiGet } from '../utils/api-client';
import { getWorkOrders } from './work-order';
import { getQuotes } from './quote';
import { getProcurements } from './procurement';
import { getInventoryBalances, getInventoryTransactions } from './inventory';
import { getPartsRequests } from './parts-request';
import { getPartsReturns } from './parts-return';
import type { ReportFilters } from './report-filters';
import { filterWorkOrders, filterQuotes, filterProcurements, filterInventory, filterTransactions, filterPartsRequests, filterPartsReturns } from './report-filters';
import { AMOUNT_BUCKETS, FAULT_TYPE_KEYWORDS } from './report-config';

// ===================== Status Colors =====================

export const WORK_ORDER_STATUS_COLORS: Record<string, string> = {
  CREATED: '#3b82f6',
  ACCEPTED: '#6366f1',
  REPAIRING: '#f59e0b',
  PENDING_SIGNATURE: '#8b5cf6',
  CLOSED: '#10b981',
  CANCELLED: '#ef4444',
};

export const QUOTE_STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  PENDING_SUPERVISOR: '#f59e0b',
  PENDING_PROCUREMENT: '#3b82f6',
  PENDING_CUSTOMER: '#6366f1',
  CONFIRMED: '#10b981',
  REJECTED: '#ef4444',
};

export const PROCUREMENT_STATUS_COLORS: Record<string, string> = {
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

// ===================== Report Data Interfaces =====================

export interface WorkOrderReportData {
  statusDistribution: { name: string; value: number; color: string }[];
  priorityDistribution: { name: string; value: number }[];
  outletDistribution: { name: string; value: number }[];
  sourceDistribution: { name: string; value: number }[];
  trendData: { date: string; count: number }[];
  total: number;
}

export interface FaultReportData {
  faultTypeDistribution: { name: string; value: number }[];
  machineTypeDistribution: { name: string; value: number }[];
  trendData: { date: string; count: number }[];
  total: number;
}

export interface QuoteReportData {
  statusDistribution: { name: string; value: number; color: string }[];
  amountDistribution: { name: string; value: number }[];
  trendData: { date: string; count: number; amount: number }[];
  totalAmount: number;
  totalCount: number;
}

export interface ProcurementReportData {
  statusDistribution: { name: string; value: number; color: string }[];
  costAnalysis: { name: string; estimated: number; actual: number }[];
  supplierDistribution: { name: string; value: number }[];
  trendData: { date: string; count: number; cost: number }[];
  totalCost: number;
  totalCount: number;
}

export interface InventoryReportData {
  warehouseStock: { warehouse: string; totalParts: number; totalQuantity: number }[];
  lowStockItems: InventoryBalance[];
  transactionTrend: { date: string; inCount: number; outCount: number }[];
  totalSKUs: number;
  totalQuantity: number;
}

export interface PartsFlowReportData {
  requestStatusDistribution: { name: string; value: number }[];
  returnReasonDistribution: { name: string; value: number }[];
  qualityResultDistribution: { name: string; value: number; color: string }[];
  requestTrend: { date: string; requestCount: number; returnCount: number }[];
  totalRequests: number;
  totalReturns: number;
}

// ===================== Fault Type Detection =====================

function detectFaultType(title: string): string {
  for (const [faultType, keywords] of Object.entries(FAULT_TYPE_KEYWORDS)) {
    if (keywords.some((kw) => title.includes(kw))) return faultType;
  }
  return '其他';
}

function detectMachineType(serialSnapshot: string | null): string {
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

// ===================== Helper: Fetch All Pages =====================

async function fetchAllWorkOrders(): Promise<WorkOrderListItem[]> {
  const all: WorkOrderListItem[] = [];
  let page = 1;
  while (true) {
    const res: PaginatedResponse<WorkOrderListItem> = await getWorkOrders({ page, pageSize: 100 });
    all.push(...res.list);
    if (all.length >= res.total) break;
    page++;
  }
  return all;
}

async function fetchAllQuotes(): Promise<Quote[]> {
  const all: Quote[] = [];
  let page = 1;
  while (true) {
    const res = await getQuotes({ page, pageSize: 100 });
    all.push(...res.list);
    if (all.length >= res.total) break;
    page++;
  }
  return all;
}

async function fetchAllProcurements(): Promise<ProcurementRequest[]> {
  const all: ProcurementRequest[] = [];
  let page = 1;
  while (true) {
    const res = await getProcurements({ page, pageSize: 100 });
    all.push(...res.list);
    if (all.length >= res.total) break;
    page++;
  }
  return all;
}

async function fetchAllInventoryBalances(): Promise<InventoryBalance[]> {
  const all: InventoryBalance[] = [];
  let page = 1;
  while (true) {
    const res = await getInventoryBalances({ page, pageSize: 100 });
    all.push(...res.list);
    if (all.length >= res.total) break;
    page++;
  }
  return all;
}

async function fetchAllTransactions(): Promise<InventoryTransaction[]> {
  const all: InventoryTransaction[] = [];
  let page = 1;
  while (true) {
    const res = await getInventoryTransactions({ page, pageSize: 100 });
    all.push(...res.list);
    if (all.length >= res.total) break;
    page++;
  }
  return all;
}

async function fetchAllPartsRequests(): Promise<PartsRequest[]> {
  const all: PartsRequest[] = [];
  let page = 1;
  while (true) {
    const res = await getPartsRequests({ page, pageSize: 100 });
    all.push(...res.list);
    if (all.length >= res.total) break;
    page++;
  }
  return all;
}

async function fetchAllPartsReturns(): Promise<PartsReturn[]> {
  const all: PartsReturn[] = [];
  let page = 1;
  while (true) {
    const res = await getPartsReturns({ page, pageSize: 100 });
    all.push(...res.list);
    if (all.length >= res.total) break;
    page++;
  }
  return all;
}

// ===================== Dashboard API (backend-computed) =====================

export interface DashboardReport {
  statusDistribution: { name: string; value: number; color: string }[];
  priorityDistribution: { name: string; value: number }[];
  faultTypeDistribution: { name: string; value: number }[];
  trendData: { date: string; count: number }[];
  total: number;
}

export async function getDashboardReport(): Promise<DashboardReport> {
  return apiGet('/reports/work-orders');
}

// ===================== Report Functions =====================

export async function getWorkOrderReport(filters: ReportFilters = {}): Promise<WorkOrderReportData> {
  const all = await fetchAllWorkOrders();
  const filtered = filterWorkOrders(all, filters);

  // Status distribution
  const statusCount: Record<string, number> = {};
  for (const item of filtered) {
    statusCount[item.state] = (statusCount[item.state] ?? 0) + 1;
  }
  const statusDistribution = Object.entries(statusCount).map(([name, value]) => ({
    name,
    value,
    color: WORK_ORDER_STATUS_COLORS[name] ?? '#6b7280',
  }));

  // Priority distribution
  const priorityCount: Record<string, number> = {};
  for (const item of filtered) {
    priorityCount[item.priority] = (priorityCount[item.priority] ?? 0) + 1;
  }
  const priorityDistribution = Object.entries(priorityCount).map(([name, value]) => ({
    name,
    value,
  }));

  // Outlet distribution
  const outletCount: Record<string, number> = {};
  for (const item of filtered) {
    outletCount[item.outletName] = (outletCount[item.outletName] ?? 0) + 1;
  }
  const outletDistribution = Object.entries(outletCount).map(([name, value]) => ({
    name,
    value,
  }));

  // Source distribution
  const sourceCount: Record<string, number> = {};
  for (const item of filtered) {
    sourceCount[item.source] = (sourceCount[item.source] ?? 0) + 1;
  }
  const sourceDistribution = Object.entries(sourceCount).map(([name, value]) => ({
    name,
    value,
  }));

  // Trend data (group by date)
  const dateCount: Record<string, number> = {};
  for (const item of filtered) {
    const date = item.createdAt.slice(0, 10);
    dateCount[date] = (dateCount[date] ?? 0) + 1;
  }
  const trendData = Object.entries(dateCount)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    statusDistribution,
    priorityDistribution,
    outletDistribution,
    sourceDistribution,
    trendData,
    total: filtered.length,
  };
}

export async function getFaultReport(filters: ReportFilters = {}): Promise<FaultReportData> {
  const all = await fetchAllWorkOrders();
  const filtered = filterWorkOrders(all, filters);

  // Fault type distribution
  const faultCount: Record<string, number> = {};
  for (const item of filtered) {
    const faultType = detectFaultType(item.title);
    faultCount[faultType] = (faultCount[faultType] ?? 0) + 1;
  }
  const faultTypeDistribution = Object.entries(faultCount).map(([name, value]) => ({
    name,
    value,
  }));

  // Machine type distribution
  const machineCount: Record<string, number> = {};
  for (const item of filtered) {
    const machineType = detectMachineType(item.machineSerialSnapshot);
    machineCount[machineType] = (machineCount[machineType] ?? 0) + 1;
  }
  const machineTypeDistribution = Object.entries(machineCount).map(([name, value]) => ({
    name,
    value,
  }));

  // Trend data
  const dateCount: Record<string, number> = {};
  for (const item of filtered) {
    const date = item.createdAt.slice(0, 10);
    dateCount[date] = (dateCount[date] ?? 0) + 1;
  }
  const trendData = Object.entries(dateCount)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    faultTypeDistribution,
    machineTypeDistribution,
    trendData,
    total: filtered.length,
  };
}

export async function getQuoteReport(filters: ReportFilters = {}): Promise<QuoteReportData> {
  const all = await fetchAllQuotes();
  const filtered = filterQuotes(all, filters);

  // Status distribution
  const statusCount: Record<string, number> = {};
  for (const item of filtered) {
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
  for (const item of filtered) {
    const label = getAmountBucketLabel(item.totalAmount);
    amountBuckets[label] = (amountBuckets[label] ?? 0) + 1;
  }
  const amountDistribution = Object.entries(amountBuckets).map(([name, value]) => ({
    name,
    value,
  }));

  // Trend data
  const dateData: Record<string, { count: number; amount: number }> = {};
  for (const item of filtered) {
    const date = item.createdAt.slice(0, 10);
    if (!dateData[date]) dateData[date] = { count: 0, amount: 0 };
    dateData[date].count++;
    dateData[date].amount += item.totalAmount;
  }
  const trendData = Object.entries(dateData)
    .map(([date, data]) => ({ date, count: data.count, amount: data.amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    statusDistribution,
    amountDistribution,
    trendData,
    totalAmount: filtered.reduce((sum, item) => sum + item.totalAmount, 0),
    totalCount: filtered.length,
  };
}

export async function getProcurementReport(filters: ReportFilters = {}): Promise<ProcurementReportData> {
  const all = await fetchAllProcurements();
  const filtered = filterProcurements(all, filters);

  // Status distribution
  const statusCount: Record<string, number> = {};
  for (const item of filtered) {
    statusCount[item.status] = (statusCount[item.status] ?? 0) + 1;
  }
  const statusDistribution = Object.entries(statusCount).map(([name, value]) => ({
    name,
    value,
    color: PROCUREMENT_STATUS_COLORS[name] ?? '#6b7280',
  }));

  // Cost analysis
  const costBySupplier: Record<string, { estimated: number; actual: number }> = {};
  for (const item of filtered) {
    if (!costBySupplier[item.supplierName]) {
      costBySupplier[item.supplierName] = { estimated: 0, actual: 0 };
    }
    costBySupplier[item.supplierName].estimated += item.estimatedCost;
    costBySupplier[item.supplierName].actual += item.actualCost ?? 0;
  }
  const costAnalysis = Object.entries(costBySupplier).map(([name, data]) => ({
    name,
    estimated: data.estimated,
    actual: data.actual,
  }));

  // Supplier distribution
  const supplierCount: Record<string, number> = {};
  for (const item of filtered) {
    supplierCount[item.supplierName] = (supplierCount[item.supplierName] ?? 0) + 1;
  }
  const supplierDistribution = Object.entries(supplierCount).map(([name, value]) => ({
    name,
    value,
  }));

  // Trend data
  const dateData: Record<string, { count: number; cost: number }> = {};
  for (const item of filtered) {
    const date = item.createdAt.slice(0, 10);
    if (!dateData[date]) dateData[date] = { count: 0, cost: 0 };
    dateData[date].count++;
    dateData[date].cost += item.estimatedCost;
  }
  const trendData = Object.entries(dateData)
    .map(([date, data]) => ({ date, count: data.count, cost: data.cost }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    statusDistribution,
    costAnalysis,
    supplierDistribution,
    trendData,
    totalCost: filtered.reduce((sum, item) => sum + item.estimatedCost, 0),
    totalCount: filtered.length,
  };
}

export async function getInventoryReport(filters: ReportFilters = {}): Promise<InventoryReportData> {
  const balances = await fetchAllInventoryBalances();
  const transactions = await fetchAllTransactions();
  const filteredBalances = filterInventory(balances, filters);
  const filteredTransactions = filterTransactions(transactions, filters);

  // Warehouse stock summary
  const warehouseMap: Record<string, { totalParts: number; totalQuantity: number }> = {};
  for (const item of filteredBalances) {
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
  const lowStockItems = filteredBalances.filter((item) => item.quantityAvailable < 5);

  // Transaction trend
  const dateData: Record<string, { inCount: number; outCount: number }> = {};
  for (const txn of filteredTransactions) {
    const date = txn.occurredAt.slice(0, 10);
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
    totalSKUs: filteredBalances.length,
    totalQuantity: filteredBalances.reduce((sum, item) => sum + item.quantityOnHand, 0),
  };
}

export async function getPartsFlowReport(filters: ReportFilters = {}): Promise<PartsFlowReportData> {
  const requests = await fetchAllPartsRequests();
  const returns = await fetchAllPartsReturns();
  const filteredRequests = filterPartsRequests(requests, filters);
  const filteredReturns = filterPartsReturns(returns, filters);

  // Request status distribution
  const requestStatusCount: Record<string, number> = {};
  for (const item of filteredRequests) {
    requestStatusCount[item.status] = (requestStatusCount[item.status] ?? 0) + 1;
  }
  const requestStatusDistribution = Object.entries(requestStatusCount).map(([name, value]) => ({
    name,
    value,
  }));

  // Return reason distribution
  const returnReasonCount: Record<string, number> = {};
  for (const item of filteredReturns) {
    const label = RETURN_REASON_LABELS[item.reason] ?? item.reason;
    returnReasonCount[label] = (returnReasonCount[label] ?? 0) + 1;
  }
  const returnReasonDistribution = Object.entries(returnReasonCount).map(([name, value]) => ({
    name,
    value,
  }));

  // Quality result distribution
  const qualityCount: Record<string, number> = {};
  for (const item of filteredReturns) {
    for (const returnItem of item.items) {
      if (returnItem.qualityResult) {
        qualityCount[returnItem.qualityResult] = (qualityCount[returnItem.qualityResult] ?? 0) + 1;
      }
    }
  }
  const qualityResultDistribution = Object.entries(qualityCount).map(([name, value]) => ({
    name,
    value,
    color: QUALITY_RESULT_COLORS[name as QualityResult] ?? '#6b7280',
  }));

  // Request trend
  const dateData: Record<string, { requestCount: number; returnCount: number }> = {};
  for (const item of filteredRequests) {
    const date = item.createdAt.slice(0, 10);
    if (!dateData[date]) dateData[date] = { requestCount: 0, returnCount: 0 };
    dateData[date].requestCount++;
  }
  for (const item of filteredReturns) {
    const date = item.createdAt.slice(0, 10);
    if (!dateData[date]) dateData[date] = { requestCount: 0, returnCount: 0 };
    dateData[date].returnCount++;
  }
  const requestTrend = Object.entries(dateData)
    .map(([date, data]) => ({ date, requestCount: data.requestCount, returnCount: data.returnCount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    requestStatusDistribution,
    returnReasonDistribution,
    qualityResultDistribution,
    requestTrend,
    totalRequests: filteredRequests.length,
    totalReturns: filteredReturns.length,
  };
}
