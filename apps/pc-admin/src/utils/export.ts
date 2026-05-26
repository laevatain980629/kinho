/**
 * Export data as CSV with BOM for Excel compatibility.
 */
export function exportCSV(
  headers: string[],
  rows: (string | number)[][],
  filename: string,
): void {
  const BOM = '﻿';
  const escapeCSV = (val: string | number): string => {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent =
    BOM +
    headers.map(escapeCSV).join(',') +
    '\n' +
    rows.map((row) => row.map(escapeCSV).join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trigger browser print for report page.
 */
export function printReport(): void {
  window.print();
}
