import { useEffect, useState } from 'react';
import { Card, Button } from '@heroui/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import ReportFilters from './ReportFilters';
import { getQuoteReport } from '@/services/report';
import type { ReportFilters as Filters, QuoteReportData } from '@/services/report';

interface Props {
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
}

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
};

function formatCurrency(value: number): string {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿',
  PENDING_SUPERVISOR: '待主管审批',
  PENDING_PROCUREMENT: '待采购',
  PENDING_CUSTOMER: '待客户确认',
  CONFIRMED: '已确认',
  REJECTED: '已拒绝',
};

export default function QuoteReport({ filters, onFiltersChange }: Props) {
  const [data, setData] = useState<QuoteReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getQuoteReport(filters)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [filters]);

  if (loading) {
    return <div className="text-sm text-[var(--muted)] py-8 text-center">加载中...</div>;
  }

  if (!data) {
    return <div className="text-sm text-[var(--muted)] py-8 text-center">暂无数据</div>;
  }

  const avgAmount = data.totalCount > 0 ? data.totalAmount / data.totalCount : 0;

  // Calculate approval rate from statusDistribution
  const confirmedCount = data.statusDistribution.find((s) => s.name === 'CUSTOMER_CONFIRMED')?.value ?? 0;
  const approvalRate = data.totalCount > 0 ? confirmedCount / data.totalCount : 0;

  const pieData = data.statusDistribution.map((s) => ({
    name: STATUS_LABELS[s.name] ?? s.name,
    value: s.value,
    color: s.color,
  }));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ReportFilters
        filters={filters}
        onChange={onFiltersChange}
        showOutlet={false}
        showEngineer={false}
        showStatus
        statusOptions={[
          { label: '草稿', value: 'DRAFT' },
          { label: '待主管审批', value: 'PENDING_SUPERVISOR' },
          { label: '待采购', value: 'PENDING_PROCUREMENT' },
          { label: '待客户确认', value: 'PENDING_CUSTOMER_CONFIRM' },
          { label: '已确认', value: 'CUSTOMER_CONFIRMED' },
          { label: '已拒绝', value: 'REJECTED' },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-[var(--muted)]">总报价数</div>
          <div className="text-2xl font-bold mt-1">{data.totalCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--muted)]">通过率</div>
          <div className="text-2xl font-bold mt-1">{formatPercent(approvalRate)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--muted)]">平均金额</div>
          <div className="text-2xl font-bold mt-1">{formatCurrency(avgAmount)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--muted)]">总金额</div>
          <div className="text-2xl font-bold mt-1">{formatCurrency(data.totalAmount)}</div>
        </Card>
      </div>

      {/* Export + Print */}
      <div className="flex gap-3">
        <Button
          size="sm"
          variant="outline"
          onPress={() => {
            if (!data) return;
            const header = ['总报价数', '通过率', '平均金额', '总金额'];
            const row = [
              String(data.totalCount),
              formatPercent(approvalRate),
              formatCurrency(avgAmount),
              formatCurrency(data.totalAmount),
            ];
            const csv = [header.join(','), row.join(',')].join('\n');
            const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'quote-report.csv';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          导出 CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onPress={() => window.print()}
        >
          打印
        </Button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Bar Chart - Amount Distribution */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">金额分布</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.amountDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="value"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie Chart - Status Distribution */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">状态分布</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
