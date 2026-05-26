import { useState, useEffect } from 'react';
import { Card, Table, Chip, Button } from '@heroui/react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { getWorkOrderReport } from '../../services/report';
import type { ReportFilters, WorkOrderReportData } from '../../services/report';
import { exportCSV, printReport } from '../../utils/export';

interface Props {
  filters: ReportFilters;
  onFiltersChange: (f: ReportFilters) => void;
}

const STATUS_LABELS: Record<string, string> = {
  CREATED: '已创建',
  ACCEPTED: '已接受',
  REPAIRING: '维修中',
  PENDING_SIGNATURE: '待签名',
  CLOSED: '已关闭',
  CANCELLED: '已取消',
};

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: '紧急',
  NORMAL: '普通',
  LOW: '低',
};

const SOURCE_LABELS: Record<string, string> = {
  PHONE: '电话',
  WECHAT: '微信',
  SYSTEM: '系统',
  MANUAL: '手动',
  OTHER: '其他',
};

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default function WorkOrderReport({ filters }: Props) {
  const [data, setData] = useState<WorkOrderReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getWorkOrderReport(filters)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [filters]);

  if (loading && !data) {
    return <div className="p-6 text-[var(--muted)]">加载中...</div>;
  }

  if (!data) return null;

  // ─── KPI cards ────────────────────────────────────────────────
  const totalOrders = data.total;
  const closedCount =
    data.statusDistribution.find((s) => s.name === 'CLOSED')?.value ?? 0;
  const completionRate = totalOrders > 0 ? closedCount / totalOrders : 0;
  const activeOutlets = data.outletDistribution.length;
  const avgPerOutlet = activeOutlets > 0 ? Math.round(totalOrders / activeOutlets) : 0;

  const kpis = [
    { label: '总工单数', value: totalOrders.toLocaleString(), color: 'var(--accent)' },
    { label: '完成率', value: formatPercent(completionRate), color: 'var(--success)' },
    { label: '活跃网点数', value: String(activeOutlets), color: '#8b5cf6' },
    { label: '每网点平均', value: String(avgPerOutlet), color: 'var(--warning)' },
  ];

  // ─── Chart tooltip style ──────────────────────────────────────
  const tooltipStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12,
  };

  // ─── Export handlers ──────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ['状态', '数量', '占比'];
    const rows = data.statusDistribution.map((item) => [
      STATUS_LABELS[item.name] ?? item.name,
      item.value,
      totalOrders > 0 ? `${((item.value / totalOrders) * 100).toFixed(1)}%` : '0%',
    ]);
    exportCSV(headers, rows, '工单状态分布.csv');
  };

  const handlePrint = () => {
    printReport();
  };

  return (
    <div className="space-y-6">
      {/* ─── Header with export buttons ───────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">工单报表</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onPress={handleExportCSV}>
            导出 CSV
          </Button>
          <Button size="sm" variant="ghost" onPress={handlePrint}>
            打印
          </Button>
        </div>
      </div>

      {/* ─── KPI cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <Card.Content className="p-4">
              <div className="text-sm text-[var(--muted)]">{kpi.label}</div>
              <div className="mt-1">
                <span className="text-3xl font-bold" style={{ color: kpi.color }}>
                  {kpi.value}
                </span>
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>

      {/* ─── Charts row: trend + status pie ───────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Trend line chart */}
        <Card>
          <Card.Header className="px-4 pt-4">
            <Card.Title>工单趋势</Card.Title>
          </Card.Header>
          <Card.Content className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--muted)' }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.max(Math.floor(data.trendData.length / 7), 0)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted)' }}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="工单数"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card.Content>
        </Card>

        {/* Status distribution pie chart */}
        <Card>
          <Card.Header className="px-4 pt-4">
            <Card.Title>状态分布</Card.Title>
          </Card.Header>
          <Card.Content className="px-4 pb-4">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${STATUS_LABELS[name ?? ''] ?? name ?? ''} ${formatPercent(percent ?? 0)}`
                  }
                  labelLine={false}
                  style={{ fontSize: 11 }}
                >
                  {data.statusDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [`${value} 单`, '数量']}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card.Content>
        </Card>
      </div>

      {/* ─── Outlet ranking bar chart ─────────────────────────── */}
      <Card>
        <Card.Header className="px-4 pt-4">
          <Card.Title>网点工单排行</Card.Title>
        </Card.Header>
        <Card.Content className="px-4 pb-4">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.outletDistribution} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'var(--muted)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: 'var(--foreground)' }}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => [`${value} 单`, '数量']}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </Card.Content>
      </Card>

      {/* ─── Source + Priority tables (two columns) ───────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Priority distribution table */}
        <Card>
          <Card.Header className="px-4 pt-4">
            <Card.Title>优先级分布</Card.Title>
          </Card.Header>
          <Card.Content className="p-0">
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="优先级分布">
                  <Table.Header>
                    <Table.Column isRowHeader>优先级</Table.Column>
                    <Table.Column>数量</Table.Column>
                    <Table.Column>占比</Table.Column>
                  </Table.Header>
                  <Table.Body items={data.priorityDistribution.map((d, i) => ({ ...d, id: d.name || String(i) }))}>
                    {(row) => (
                      <Table.Row key={row.name}>
                        <Table.Cell>
                          <Chip color={row.name === 'URGENT' ? 'danger' : row.name === 'LOW' ? 'default' : 'warning'} variant="primary" size="sm">
                            {PRIORITY_LABELS[row.name] ?? row.name}
                          </Chip>
                        </Table.Cell>
                        <Table.Cell>{row.value}</Table.Cell>
                        <Table.Cell>
                          {totalOrders > 0 ? formatPercent(row.value / totalOrders) : '0%'}
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </Card.Content>
        </Card>

        {/* Source distribution table */}
        <Card>
          <Card.Header className="px-4 pt-4">
            <Card.Title>来源分布</Card.Title>
          </Card.Header>
          <Card.Content className="p-0">
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="来源分布">
                  <Table.Header>
                    <Table.Column isRowHeader>来源</Table.Column>
                    <Table.Column>数量</Table.Column>
                    <Table.Column>占比</Table.Column>
                  </Table.Header>
                  <Table.Body items={data.sourceDistribution.map((d, i) => ({ ...d, id: d.name || String(i) }))}>
                    {(row) => (
                      <Table.Row key={row.name}>
                        <Table.Cell>{SOURCE_LABELS[row.name] ?? row.name}</Table.Cell>
                        <Table.Cell>{row.value}</Table.Cell>
                        <Table.Cell>
                          {totalOrders > 0 ? formatPercent(row.value / totalOrders) : '0%'}
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
