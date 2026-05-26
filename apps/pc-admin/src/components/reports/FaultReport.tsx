import { useEffect, useState } from 'react';
import { Card, Table, Button } from '@heroui/react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import ReportFilters from './ReportFilters';
import { getFaultReport } from '@/services/report';
import { exportCSV, printReport } from '@/utils/export';
import type { ReportFilters as Filters, FaultReportData } from '@/services/report';

// Chart-specific palette — these hex values are chosen for sufficient contrast
// and distinguishability in both light and dark themes.
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#6b7280'];

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
};

interface Props {
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
}

export default function FaultReport({ filters, onFiltersChange }: Props) {
  const [data, setData] = useState<FaultReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getFaultReport(filters)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [filters]);

  if (loading) {
    return <div className="py-12 text-center text-[var(--muted)]">加载中…</div>;
  }

  if (!data) {
    return <div className="py-12 text-center text-[var(--muted)]">暂无数据</div>;
  }

  // Derived KPIs
  const topFaultType = data.faultTypeDistribution.length > 0
    ? data.faultTypeDistribution.reduce((a, b) => (a.value > b.value ? a : b)).name
    : '-';
  const machineCount = data.machineTypeDistribution.length;

  // Cross-analysis data: combine faultTypeDistribution with machineTypeDistribution
  // Build a combined dataset for the BarChart
  const crossData = data.faultTypeDistribution.map((ft) => {
    const row: Record<string, string | number> = { faultType: ft.name, count: ft.value };
    return row;
  });

  // Outlet-matrix-like table data: fault type distribution as a table
  const tableRows = data.faultTypeDistribution.map((item, index) => ({
    id: item.name || String(index),
    name: item.name,
    value: item.value,
  }));

  const handleExport = () => {
    const headers = ['故障类型', '数量'];
    const rows = data.faultTypeDistribution.map((item) => [item.name, item.value]);
    exportCSV(headers, rows, '故障统计报表.csv');
  };

  const handlePrint = () => {
    printReport();
  };

  return (
    <div className="space-y-4">
      {/* ReportFilters */}
      <ReportFilters filters={filters} onChange={onFiltersChange} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm text-[var(--muted)]">总故障数</div>
          <div className="mt-1 text-2xl font-bold text-[var(--foreground)]">{data.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--muted)]">最常见故障类型</div>
          <div className="mt-1 text-2xl font-bold text-[var(--foreground)]">{topFaultType}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--muted)]">涉及机台类型数</div>
          <div className="mt-1 text-2xl font-bold text-[var(--foreground)]">{machineCount}</div>
        </Card>
      </div>

      {/* Export + Print buttons */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onPress={handleExport}>
          导出 CSV
        </Button>
        <Button size="sm" variant="outline" onPress={handlePrint}>
          打印报表
        </Button>
      </div>

      {/* Charts row: PieChart + LineChart */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* PieChart: 故障类型分布 */}
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-medium text-[var(--foreground)]">故障类型分布</h3>
          {data.faultTypeDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.faultTypeDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {data.faultTypeDistribution.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-12 text-center text-[var(--muted)]">暂无数据</div>
          )}
        </Card>

        {/* LineChart: 故障趋势（近30天） */}
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-medium text-[var(--foreground)]">故障趋势（近30天）</h3>
          {data.trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-12 text-center text-[var(--muted)]">暂无数据</div>
          )}
        </Card>
      </div>

      {/* BarChart: 故障×机台交叉分析 */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-medium text-[var(--foreground)]">故障×机台交叉分析</h3>
        {crossData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={crossData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="faultType" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="count" name="数量" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="py-12 text-center text-[var(--muted)]">暂无数据</div>
        )}
      </Card>

      {/* Table: 故障×网点分布 */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-medium text-[var(--foreground)]">故障×网点分布</h3>
        <Table aria-label="故障分布表格">
          <Table.ScrollContainer>
            <Table.Content>
              <Table.Header>
                <Table.Column isRowHeader>故障类型</Table.Column>
                <Table.Column>数量</Table.Column>
              </Table.Header>
              <Table.Body items={tableRows}>
                {(item) => (
                  <Table.Row key={item.id}>
                    <Table.Cell>{item.name}</Table.Cell>
                    <Table.Cell>{item.value}</Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </Card>
    </div>
  );
}
