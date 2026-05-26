export type { ReportFilters } from './report-filters';
export {
  inDateRange,
  filterWorkOrders,
  filterQuotes,
  filterProcurements,
  filterInventory,
  filterTransactions,
  filterPartsRequests,
  filterPartsReturns,
} from './report-filters';

export type {
  WorkOrderReportData,
  FaultReportData,
  QuoteReportData,
  ProcurementReportData,
  InventoryReportData,
  PartsFlowReportData,
} from './report-data';
export {
  WORK_ORDER_STATUS_COLORS,
  QUOTE_STATUS_COLORS,
  PROCUREMENT_STATUS_COLORS,
  getWorkOrderReport,
  getFaultReport,
  getQuoteReport,
  getProcurementReport,
  getInventoryReport,
  getPartsFlowReport,
} from './report-data';

function downloadCSV(headers: string[], rows: (string | number | null | undefined)[][], filename: string): void {
  const bom = '\uFEFF';
  const escapeCSV = (value: string | number | null | undefined): string => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = bom + [headers, ...rows].map((row) => row.map(escapeCSV).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportCSV(reportType: string): void;
export function exportCSV(headers: string[], rows: (string | number | null | undefined)[][], filename: string): void;
export function exportCSV(
  reportTypeOrHeaders: string | string[],
  rows: (string | number | null | undefined)[][] = [],
  filename?: string,
): void {
  if (Array.isArray(reportTypeOrHeaders)) {
    downloadCSV(reportTypeOrHeaders, rows, filename || 'report.csv');
    return;
  }

  const reportType = reportTypeOrHeaders;
  downloadCSV(['报表类型', '导出时间'], [[reportType, new Date().toLocaleString('zh-CN')]], `${reportType}-report.csv`);
}

export function printReport(_reportType?: string): void {
  window.print();
}
