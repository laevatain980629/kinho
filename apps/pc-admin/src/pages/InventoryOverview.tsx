import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { BarChart3, Boxes, ChevronDown, ChevronRight, RefreshCw, UserRound, Warehouse } from 'lucide-react';
import { Button, Card, Chip, Input, Label, ListBox, Select, TextField } from '@heroui/react';
import { LoadingView } from '@kinho/shared-components';
import {
  INVENTORY_DIRECTION_LABELS,
  TRANSACTION_TYPE_LABELS,
  type InventoryBalance,
  type InventoryTransaction,
  type Warehouse as WarehouseType,
} from '@kinho/shared-types';
import { getInventoryBalances, getInventoryTransactions } from '@/services/inventory';
import { getAllWarehouses } from '@/services/warehouse';

type ViewKey = 'overview' | 'outlet' | 'personal' | 'flow';
type WarehouseFilter = 'ALL' | WarehouseType['type'];

interface OutletGroup {
  outletWarehouse: WarehouseType;
  outletBalances: InventoryBalance[];
  engineerGroups: Array<{ warehouse: WarehouseType; balances: InventoryBalance[] }>;
  totalAvailable: number;
  outletAvailable: number;
  personalAvailable: number;
}

function sumAvailable(items: InventoryBalance[]) {
  return items.reduce((sum, item) => sum + item.quantityAvailable, 0);
}

function sumOnHand(items: InventoryBalance[]) {
  return items.reduce((sum, item) => sum + item.quantityOnHand, 0);
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatCard({ label, value, meta, accent = false }: { label: string; value: number | string; meta: string; accent?: boolean }) {
  return (
    <Card className="shadow-[var(--surface-shadow)]">
      <Card.Content className="p-4">
        <div className="text-sm text-[var(--muted)]">{label}</div>
        <div className={`mt-2 text-[30px] font-bold leading-none ${accent ? 'text-[var(--accent)]' : 'text-[var(--foreground)]'}`}>{value}</div>
        <div className="mt-2 text-xs text-[var(--muted)]">{meta}</div>
      </Card.Content>
    </Card>
  );
}

function BalanceTable({ balances, compact = false }: { balances: InventoryBalance[]; compact?: boolean }) {
  if (balances.length === 0) {
    return <div className="rounded-xl border border-dashed border-[var(--border)] py-10 text-center text-sm text-[var(--muted)]">暂无库存</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--surface-secondary)] text-xs text-[var(--muted)]">
          <tr>
            <th className="px-3 py-2.5 text-left font-medium">配件</th>
            {!compact && <th className="px-3 py-2.5 text-left font-medium">仓库</th>}
            <th className="px-3 py-2.5 text-right font-medium">现存</th>
            <th className="px-3 py-2.5 text-right font-medium">可用</th>
            <th className="px-3 py-2.5 text-right font-medium">冻结</th>
          </tr>
        </thead>
        <tbody>
          {balances.map((item) => (
            <tr key={item.id} className="border-t border-[var(--border)]">
              <td className="px-3 py-3">
                <div className="font-medium text-[var(--foreground)]">{item.partName}</div>
                <div className="mt-0.5 text-xs text-[var(--muted)]">{item.partNo} · {item.partModel || '-'}</div>
              </td>
              {!compact && <td className="px-3 py-3 text-[var(--muted)]">{item.warehouseName}</td>}
              <td className="px-3 py-3 text-right font-medium">{item.quantityOnHand}</td>
              <td className={`px-3 py-3 text-right font-semibold ${item.quantityAvailable <= 2 ? 'text-[var(--warning)]' : 'text-[var(--foreground)]'}`}>{item.quantityAvailable}</td>
              <td className="px-3 py-3 text-right text-[var(--muted)]">{item.quantityReserved}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function InventoryOverview() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewKey>('overview');
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<WarehouseFilter>('ALL');
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOutlets, setExpandedOutlets] = useState<Set<number>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getInventoryBalances({ keyword, page: 1, pageSize: 800 }),
      getAllWarehouses(),
      getInventoryTransactions({ page: 1, pageSize: 80 }),
    ])
      .then(([balanceRes, warehouseRes, transactionRes]) => {
        setBalances(balanceRes.list || []);
        setWarehouses(warehouseRes || []);
        setTransactions(transactionRes.list || []);
      })
      .catch(() => {
        setBalances([]);
        setWarehouses([]);
        setTransactions([]);
      })
      .finally(() => setLoading(false));
  }, [keyword]);

  useEffect(() => {
    load();
  }, [load]);

  const warehouseById = useMemo(() => new Map(warehouses.map((warehouse) => [warehouse.id, warehouse])), [warehouses]);

  const visibleBalances = useMemo(() => {
    if (typeFilter === 'ALL') return balances;
    return balances.filter((item) => warehouseById.get(item.warehouseId)?.type === typeFilter);
  }, [balances, typeFilter, warehouseById]);

  const hqBalances = useMemo(() => visibleBalances.filter((item) => warehouseById.get(item.warehouseId)?.type === 'HQ_WAREHOUSE'), [visibleBalances, warehouseById]);
  const outletBalances = useMemo(() => visibleBalances.filter((item) => warehouseById.get(item.warehouseId)?.type === 'OUTLET_WAREHOUSE'), [visibleBalances, warehouseById]);
  const personalBalances = useMemo(() => visibleBalances.filter((item) => warehouseById.get(item.warehouseId)?.type === 'ENGINEER_WAREHOUSE'), [visibleBalances, warehouseById]);
  const lowStockCount = useMemo(() => visibleBalances.filter((item) => item.quantityAvailable <= 2).length, [visibleBalances]);

  const outletGroups = useMemo<OutletGroup[]>(() => {
    const outletWarehouses = warehouses.filter((warehouse) => warehouse.type === 'OUTLET_WAREHOUSE');
    const engineerWarehouses = warehouses.filter((warehouse) => warehouse.type === 'ENGINEER_WAREHOUSE');

    return outletWarehouses.map((outletWarehouse) => {
      const outletId = outletWarehouse.outletId;
      const outletOnlyBalances = visibleBalances.filter((item) => item.warehouseId === outletWarehouse.id);
      const childEngineerWarehouses = engineerWarehouses.filter(
        (warehouse) => warehouse.outletId === outletId || warehouse.ownerOutletIdSnapshot === outletId,
      );
      const engineerGroups = childEngineerWarehouses.map((warehouse) => ({
        warehouse,
        balances: visibleBalances.filter((item) => item.warehouseId === warehouse.id),
      }));
      const outletAvailable = sumAvailable(outletOnlyBalances);
      const personalAvailable = engineerGroups.reduce((sum, group) => sum + sumAvailable(group.balances), 0);

      return {
        outletWarehouse,
        outletBalances: outletOnlyBalances,
        engineerGroups,
        totalAvailable: outletAvailable + personalAvailable,
        outletAvailable,
        personalAvailable,
      };
    });
  }, [visibleBalances, warehouses]);

  const toggleOutlet = (warehouseId: number) => {
    setExpandedOutlets((prev) => {
      const next = new Set(prev);
      if (next.has(warehouseId)) next.delete(warehouseId);
      else next.add(warehouseId);
      return next;
    });
  };

  const views: Array<{ key: ViewKey; label: string }> = [
    { key: 'overview', label: '总览' },
    { key: 'outlet', label: '网点' },
    { key: 'personal', label: '个人仓' },
    { key: 'flow', label: '流水' },
  ];

  const visibleOutletGroups = view === 'outlet' ? outletGroups : outletGroups.slice(0, 2);
  const personalWarehouses = warehouses.filter((warehouse) => warehouse.type === 'ENGINEER_WAREHOUSE');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-[var(--accent)]/10 p-2.5">
          <BarChart3 className="size-6 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">库存总览</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">总仓 / 网点仓 / 个人仓</p>
        </div>
        <Button variant="ghost" size="sm" className="ml-auto" onPress={load}>
          <RefreshCw className="size-4" />
          刷新
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="总仓" value={sumAvailable(hqBalances)} meta={`${hqBalances.length} 条库存`} accent />
        <StatCard label="网点总和" value={sumAvailable(outletBalances) + sumAvailable(personalBalances)} meta="网点仓 + 个人仓" />
        <StatCard label="个人仓" value={sumAvailable(personalBalances)} meta={`${personalBalances.length} 条库存`} />
        <StatCard label="低库存" value={lowStockCount} meta="可用数 <= 2" />
      </div>

      <Card className="shadow-[var(--surface-shadow)]">
        <Card.Content className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-xl bg-[var(--surface-secondary)] p-1">
              {views.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    view === item.key ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                  onClick={() => setView(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <TextField value={keyword} onChange={setKeyword} className="w-72">
              <Label className="sr-only">搜索库存</Label>
              <Input placeholder="搜索物料号、名称、型号" />
            </TextField>

            <Select
              value={typeFilter}
              onChange={(value) => setTypeFilter(String(value || 'ALL') as WarehouseFilter)}
              className="w-44"
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item key="ALL" id="ALL" textValue="全部仓库">
                    全部仓库
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item key="HQ_WAREHOUSE" id="HQ_WAREHOUSE" textValue="总仓">
                    总仓
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item key="OUTLET_WAREHOUSE" id="OUTLET_WAREHOUSE" textValue="网点仓">
                    网点仓
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item key="ENGINEER_WAREHOUSE" id="ENGINEER_WAREHOUSE" textValue="个人仓">
                    个人仓
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        </Card.Content>
      </Card>

      {loading ? (
        <LoadingView skeleton skeletonRows={8} />
      ) : view === 'overview' ? (
        <div className="grid grid-cols-2 gap-4">
          <Card className="shadow-[var(--surface-shadow)]">
            <Card.Content className="space-y-4 p-4">
              <div className="flex items-center gap-2">
                <Warehouse className="size-5 text-[var(--accent)]" />
                <div>
                  <div className="font-semibold text-[var(--foreground)]">总仓</div>
                  <div className="text-xs text-[var(--muted)]">K3 同步口径</div>
                </div>
                <Chip color="accent" size="sm" className="ml-auto">
                  {sumAvailable(hqBalances)}
                </Chip>
              </div>
              <BalanceTable balances={hqBalances.slice(0, 8)} compact />
            </Card.Content>
          </Card>

          <Card className="shadow-[var(--surface-shadow)]">
            <Card.Content className="space-y-4 p-4">
              <div className="flex items-center gap-2">
                <Boxes className="size-5 text-[var(--accent)]" />
                <div>
                  <div className="font-semibold text-[var(--foreground)]">网点总和</div>
                  <div className="text-xs text-[var(--muted)]">网点仓 + 个人仓</div>
                </div>
                <Chip color="accent" size="sm" className="ml-auto">
                  {outletGroups.length} 个网点
                </Chip>
              </div>
              <div className="space-y-2">
                {outletGroups.slice(0, 6).map((group) => (
                  <button
                    key={group.outletWarehouse.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-secondary)]"
                    onClick={() => {
                      setView('outlet');
                      setExpandedOutlets(new Set([group.outletWarehouse.id]));
                    }}
                  >
                    <div>
                      <div className="text-sm font-medium text-[var(--foreground)]">
                        {group.outletWarehouse.outletName || group.outletWarehouse.name}
                      </div>
                      <div className="text-xs text-[var(--muted)]">
                        网点 {group.outletAvailable} · 个人 {group.personalAvailable}
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold text-[var(--accent)]">
                      {group.totalAvailable}
                    </div>
                  </button>
                ))}
              </div>
            </Card.Content>
          </Card>
        </div>
      ) : view === 'outlet' ? (
        <div className="space-y-3">
          {visibleOutletGroups.map((group) => {
            const expanded = expandedOutlets.has(group.outletWarehouse.id);
            return (
              <Card key={group.outletWarehouse.id} className="shadow-[var(--surface-shadow)]">
                <Card.Content className="p-0">
                  <button
                    type="button"
                    className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-[var(--surface-secondary)]"
                    onClick={() => toggleOutlet(group.outletWarehouse.id)}
                  >
                    {expanded ? (
                      <ChevronDown className="size-4 text-[var(--muted)]" />
                    ) : (
                      <ChevronRight className="size-4 text-[var(--muted)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[var(--foreground)]">
                        {group.outletWarehouse.outletName || group.outletWarehouse.name}
                      </div>
                      <div className="mt-1 text-xs text-[var(--muted)]">
                        网点仓 {group.outletAvailable} · 个人仓 {group.personalAvailable} · 工程师仓 {group.engineerGroups.length}
                      </div>
                    </div>
                    <Chip color="accent" size="sm">
                      {group.totalAvailable}
                    </Chip>
                  </button>

                  {expanded && (
                    <div className="space-y-4 border-t border-[var(--border)] p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-[var(--foreground)]">网点仓</div>
                          <div className="text-xs text-[var(--muted)]">{group.outletWarehouse.name}</div>
                        </div>
                        <Button variant="ghost" size="sm" onPress={() => navigate(`/warehouses/${group.outletWarehouse.id}`)}>
                          查看仓库
                        </Button>
                      </div>
                      <BalanceTable balances={group.outletBalances} />

                      <div className="grid grid-cols-3 gap-3">
                        {group.engineerGroups.map((engineer) => (
                          <button
                            key={engineer.warehouse.id}
                            type="button"
                            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-colors hover:bg-[var(--surface-secondary)]"
                            onClick={() => navigate(`/warehouses/${engineer.warehouse.id}`)}
                          >
                            <div className="flex items-center gap-2">
                              <UserRound className="size-4 text-[var(--accent)]" />
                              <span className="truncate text-sm font-medium text-[var(--foreground)]">
                                {engineer.warehouse.ownerEngineerName || engineer.warehouse.name}
                              </span>
                            </div>
                            <div className="mt-2 text-xl font-bold text-[var(--foreground)]">
                              {sumAvailable(engineer.balances)}
                            </div>
                            <div className="text-xs text-[var(--muted)]">个人仓可用</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </Card.Content>
              </Card>
            );
          })}
        </div>
      ) : view === 'personal' ? (
        <div className="grid grid-cols-3 gap-4">
          {personalWarehouses.map((warehouse) => {
            const items = visibleBalances.filter((item) => item.warehouseId === warehouse.id);
            return (
              <Card
                key={warehouse.id}
                className="cursor-pointer shadow-[var(--surface-shadow)] transition-colors hover:bg-[var(--surface-secondary)]"
                onClick={() => navigate(`/warehouses/${warehouse.id}`)}
              >
                <Card.Content className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[var(--foreground)]">
                        {warehouse.ownerEngineerName || warehouse.name}
                      </div>
                      <div className="mt-1 text-xs text-[var(--muted)]">{warehouse.outletName || '-'}</div>
                    </div>
                    <Chip color="success" size="sm">
                      {sumAvailable(items)}
                    </Chip>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[var(--muted)]">
                    <div className="rounded-lg bg-[var(--surface-secondary)] p-2">
                      现存 <span className="font-semibold text-[var(--foreground)]">{sumOnHand(items)}</span>
                    </div>
                    <div className="rounded-lg bg-[var(--surface-secondary)] p-2">
                      SKU <span className="font-semibold text-[var(--foreground)]">{items.length}</span>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="shadow-[var(--surface-shadow)]">
          <Card.Content className="p-0">
            {transactions.length === 0 ? (
              <div className="py-12 text-center text-sm text-[var(--muted)]">暂无调拨日志</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[var(--surface-secondary)] text-xs text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">流水号</th>
                    <th className="px-4 py-3 text-left font-medium">调拨类型</th>
                    <th className="px-4 py-3 text-left font-medium">配件</th>
                    <th className="px-4 py-3 text-left font-medium">来源仓库</th>
                    <th className="px-4 py-3 text-left font-medium">目标仓库</th>
                    <th className="px-4 py-3 text-right font-medium">数量</th>
                    <th className="px-4 py-3 text-left font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((item) => (
                    <tr key={item.id} className="border-t border-[var(--border)]">
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">{item.transactionNo}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">
                        <div>{TRANSACTION_TYPE_LABELS[item.type] || item.type}</div>
                        <div className="mt-0.5 text-xs text-[var(--muted)]">
                          {INVENTORY_DIRECTION_LABELS[item.direction] || item.direction}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)]">{item.partName}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{item.fromWarehouseName || '-'}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{item.toWarehouseName || '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[var(--foreground)]">{item.quantity}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{formatDate(item.occurredAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card.Content>
        </Card>
      )}
    </div>
  );
}
