import { useEffect, useState } from 'react';
import { Card, Button } from '@heroui/react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import ReportFilters from './ReportFilters';
import { getProcurementReport, exportCSV, printReport } from '@/services/report';
import type { ReportFilters as Filters, ProcurementReportData } from '@/services/report';

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

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿',
  PENDING_QUOTE: '待报价',
  QUOTED: '已报价',
  PENDING_APPROVAL: '待审批',
  APPROVED: '已批准',
  ORDERED: '已下单',
  PARTIALLY_RECEIVED: '部分到货',
  RECEIVED: '已到货',
  REJECTED: '已拒绝',
  CANCELLED: '已取消',
};

export default function ProcurementReport({ filters, onFiltersChange }: Props) {
  const [data, setData] = useState<ProcurementReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProcurementReport(filters)
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

  const pieData = data.statusDistribution.map((s) => ({
    name: STATUS_LABELS[s.name] ?? s.name,
    value: s.value,
    color: s.color,
  }));

  const barData = data.costAnalysis.map((c) => ({
    name: c.name,
    estimated: c.estimated,
    actual: c.actual,
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
          { label: '待报价', value: 'PENDING_QUOTE' },
          { label: '已报价', value: 'QUOTED' },
          { label: '待审批', value: 'PENDING_APPROVAL' },
          { label: '已批准', value: 'APPROVED' },
          { label: '已下单', value: 'ORDERED' },
          { label: '部分到货', value: 'PARTIALLY_RECEIVED' },
          { label: '已到货', value: 'RECEIVED' },
          { label: '已拒绝', value: 'REJECTED' },
          { label: '已取消', value: 'CANCELLED' },
        ]}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-[var(--muted)]">总采购数</div>
          <div className="text-2xl font-bold mt-1">{data.totalCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--muted)]">总金额</div>
          <div className="text-2xl font-bold mt-1">{formatCurrency(data.totalCost)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--muted)]">供应商数</div>
          <div className="text-2xl font-bold mt-1">{data.supplierDistribution.length}</div>
        </Card>
      </div>

      {/* Export + Print */}
      <div className="flex gap-3">
        <Button
          size="sm"
          variant="outline"
          onPress={() => exportCSV('procurement')}
        >
          导出 CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onPress={() => printReport('procurement')}
        >
          打印
        </Button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Line Chart - Trend */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">采购趋势（近30天）</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="采购数"
              />
            </LineChart>
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
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
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

      {/* Bar Chart - Supplier Cost Analysis */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-4">供应商成本分析</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar
              dataKey="estimated"
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
              barSize={32}
              name="预估成本"
            />
            <Bar
              dataKey="actual"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              barSize={32}
              name="实际成本"
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
