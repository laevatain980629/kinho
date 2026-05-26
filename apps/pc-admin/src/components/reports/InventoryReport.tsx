import { useEffect, useState } from 'react';
import { Card, Table, Chip, Button } from '@heroui/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import ReportFilters from './ReportFilters';
import { getInventoryReport } from '@/services/report';
import type { ReportFilters as Filters, InventoryReportData } from '@/services/report';
import { exportCSV, printReport } from '@/utils/export';

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

export default function InventoryReport({ filters, onFiltersChange }: Props) {
  const [data, setData] = useState<InventoryReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getInventoryReport(filters)
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

  // Transform warehouseStock for bar chart
  const warehouseChartData = data.warehouseStock.map((w) => ({
    name: w.warehouse,
    quantity: w.totalQuantity,
  }));

  // Transform transactionTrend for line chart
  const trendChartData = data.transactionTrend.map((t) => ({
    date: t.date,
    入库: t.inCount,
    出库: t.outCount,
  }));

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
          <div className="text-sm text-[var(--muted)]">库存品种数</div>
          <div className="text-2xl font-bold mt-1">{data.totalSKUs}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--muted)]">总库存量</div>
          <div className="text-2xl font-bold mt-1">{data.totalQuantity.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-[var(--muted)]">预警库存数</div>
          <div className="text-2xl font-bold mt-1">{data.lowStockItems.length}</div>
        </Card>
      </div>

      {/* Export + Print */}
      <div className="flex gap-3">
        <Button
          size="sm"
          variant="outline"
          onPress={() => exportCSV(['配件名称', '型号', '仓库', '可用数量'], data.lowStockItems.map((item) => [item.partName, item.partModel, item.warehouseName, item.quantityAvailable]), 'inventory-report.csv')}
        >
          导出 CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onPress={() => printReport()}
        >
          打印
        </Button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Bar Chart - Warehouse Distribution */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">仓库库存分布</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={warehouseChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="quantity"
                fill="var(--accent)"
                radius={[4, 4, 0, 0]}
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Line Chart - Transaction Trend */}
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">库存流水趋势（近30天）</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line
                type="monotone"
                dataKey="入库"
                stroke="var(--success)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="出库"
                stroke="var(--danger)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Low Stock Table */}
      {data.lowStockItems.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4">低库存预警</h3>
          <Table aria-label="低库存预警列表">
            <Table.ScrollContainer>
              <Table.Content>
                <Table.Header>
                  <Table.Column isRowHeader>配件名称</Table.Column>
                  <Table.Column>型号</Table.Column>
                  <Table.Column>仓库</Table.Column>
                  <Table.Column>可用数量</Table.Column>
                </Table.Header>
                <Table.Body items={data.lowStockItems}>
                  {(item) => (
                    <Table.Row key={item.id}>
                      <Table.Cell>{item.partName}</Table.Cell>
                      <Table.Cell>{item.partModel}</Table.Cell>
                      <Table.Cell>{item.warehouseName}</Table.Cell>
                      <Table.Cell>
                        <Chip color="warning" variant="primary" size="sm">{item.quantityAvailable}</Chip>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </Card>
      )}
    </div>
  );
}
