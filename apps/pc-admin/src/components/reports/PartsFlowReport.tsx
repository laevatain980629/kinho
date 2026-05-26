import { useEffect, useState } from 'react';
import { Card, Button } from '@heroui/react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import ReportFilters from './ReportFilters';
import { getPartsFlowReport, exportCSV, printReport } from '@/services/report';
import type { ReportFilters as Filters, PartsFlowReportData } from '@/services/report';

interface Props {
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
};

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default function PartsFlowReport({ filters, onFiltersChange }: Props) {
  const [data, setData] = useState<PartsFlowReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPartsFlowReport(filters)
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

  const returnRate = data.totalRequests > 0
    ? data.totalReturns / data.totalRequests
    : 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ReportFilters
        filters={filters}
        onChange={onFiltersChange}
        showOutlet={false}
        showEngineer={false}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-[var(--muted)]">总领料数</div>
          <div className="text-2xl font-bold mt-1">{data.totalRequests}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--muted)]">总退库数</div>
          <div className="text-2xl font-bold mt-1">{data.totalReturns}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--muted)]">退库率</div>
          <div className="text-2xl font-bold mt-1">{formatPercent(returnRate)}</div>
        </Card>
      </div>

      {/* Export + Print */}
      <div className="flex gap-3">
        <Button
          size="sm"
          variant="outline"
          onPress={() => exportCSV('parts-flow')}
        >
          导出 CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onPress={() => printReport('parts-flow')}
        >
          打印
        </Button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Line Chart - 领料趋势 */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">领料趋势（近30天）</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.requestTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="requestCount"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="领料数"
              />
              <Line
                type="monotone"
                dataKey="returnCount"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="退库数"
              />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Pie Chart - 退库原因分布 */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">退库原因分布</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.returnReasonDistribution}
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
                {data.returnReasonDistribution.map((_entry, index) => (
                  <Cell key={`return-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Quality Result Distribution - Conditional */}
      {data.qualityResultDistribution.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">质量结果分布</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.qualityResultDistribution}
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
                {data.qualityResultDistribution.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
