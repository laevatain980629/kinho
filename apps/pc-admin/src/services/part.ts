import type { Part, PaginatedResponse } from '@kinho/shared-types';
import { apiGet, apiPost, apiPatch, apiDelete } from '../utils/api-client';

export async function getParts(params: { keyword?: string; categoryId?: number; page?: number; pageSize?: number }): Promise<PaginatedResponse<Part>> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.categoryId) query.set('categoryId', String(params.categoryId));
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  return apiGet(`/parts?${query.toString()}`);
}

export async function getAllParts(): Promise<Part[]> {
  return apiGet('/parts/all');
}

export async function searchParts(keyword: string): Promise<Part[]> {
  const query = new URLSearchParams({ keyword });
  return apiGet(`/parts/search?${query.toString()}`);
}

export async function createPart(data: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>): Promise<Part> {
  return apiPost('/parts', data);
}

export async function updatePart(id: number, data: Partial<Omit<Part, 'id' | 'createdAt'>>): Promise<Part> {
  return apiPatch(`/parts/${id}`, data);
}

export async function deletePart(id: number): Promise<void> {
  return apiDelete(`/parts/${id}`);
}

export async function togglePartEnabled(id: number): Promise<Part> {
  return apiPatch(`/parts/${id}/toggle-enabled`);
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === delimiter && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parsePartsFile(text: string) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error('导入文件不能为空');

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = splitDelimitedLine(lines[0], delimiter).map((h) => h.trim());
  const aliases: Record<string, string> = {
    materialNo: 'materialNo',
    partNo: 'materialNo',
    '物料号': 'materialNo',
    name: 'name',
    '名称': 'name',
    model: 'model',
    spec: 'model',
    '型号': 'model',
    unit: 'unit',
    '单位': 'unit',
    unitPrice: 'unitPrice',
    '单价': 'unitPrice',
    categoryName: 'categoryName',
    category: 'categoryName',
    '分类': 'categoryName',
  };

  return lines.slice(1).map((line) => {
    const cells = splitDelimitedLine(line, delimiter);
    const row: Record<string, string | number> = {};
    headers.forEach((header, index) => {
      const key = aliases[header] || header;
      const value = cells[index] ?? '';
      row[key] = key === 'unitPrice' && value !== '' ? Number(value) : value;
    });
    return row;
  });
}

export async function importParts(file: File): Promise<{ success: boolean; count: number; failedCount?: number; errors?: Array<{ index: number; message: string }> }> {
  const items = parsePartsFile(await file.text());
  return apiPost('/parts/import', { items });
}
