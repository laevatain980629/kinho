import { useState } from 'react';
import { Tabs } from '@heroui/react';
import { PieChart, BarChart3, TrendingUp, Package, Warehouse, ArrowLeftRight } from 'lucide-react';
import type { ReportFilters } from '@/services/report';
import WorkOrderReport from '@/components/reports/WorkOrderReport';
import FaultReport from '@/components/reports/FaultReport';
import QuoteReport from '@/components/reports/QuoteReport';
import ProcurementReport from '@/components/reports/ProcurementReport';
import InventoryReport from '@/components/reports/InventoryReport';
import PartsFlowReport from '@/components/reports/PartsFlowReport';

const TABS = [
  { id: 'work-order', label: '工单报表', icon: BarChart3 },
  { id: 'fault', label: '故障统计', icon: TrendingUp },
  { id: 'quote', label: '报价报表', icon: PieChart },
  { id: 'procurement', label: '采购报表', icon: Package },
  { id: 'inventory', label: '库存报表', icon: Warehouse },
  { id: 'parts-flow', label: '领料/退库', icon: ArrowLeftRight },
] as const;

const REPORT_MAP: Record<string, React.ComponentType<{ filters: ReportFilters; onFiltersChange: (f: ReportFilters) => void }>> = {
  'work-order': WorkOrderReport,
  fault: FaultReport,
  quote: QuoteReport,
  procurement: ProcurementReport,
  inventory: InventoryReport,
  'parts-flow': PartsFlowReport,
};

export default function ReportsCenter() {
  const [filters, setFilters] = useState<ReportFilters>({ dateRange: '30d' });
  const [selectedTab, setSelectedTab] = useState('work-order');

  const ReportComponent = REPORT_MAP[selectedTab] ?? WorkOrderReport;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10">
          <PieChart className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">报表中心</h1>
          <p className="text-xs text-[var(--muted)]">查看各类业务数据统计和分析报表</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        className="w-full"
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(key as string)}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="报表类型">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <Tabs.Tab key={tab.id} id={tab.id}>
                  <Icon className="mr-1.5 inline h-4 w-4" />
                  {tab.label}
                  <Tabs.Indicator />
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
        </Tabs.ListContainer>
        {TABS.map((tab) => (
          <Tabs.Panel key={tab.id} id={tab.id} className="pt-4">
            <ReportComponent filters={filters} onFiltersChange={setFilters} />
          </Tabs.Panel>
        ))}
      </Tabs>
    </div>
  );
}
