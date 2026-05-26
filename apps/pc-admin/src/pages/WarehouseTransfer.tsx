import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, ArrowLeftRight } from 'lucide-react';
import { Button, Card, Input, Label, ListBox, Select, TextField, Chip } from '@heroui/react';
import { toast, LoadingView } from '@kinho/shared-components';
import type { InventoryBalance, Warehouse } from '@kinho/shared-types';
import { getAllWarehouses } from '@/services/warehouse';
import { getInventoryBalances, transferInventory } from '@/services/inventory';

function useQueryParam(name: string) {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search).get(name) || '', [search, name]);
}

export default function WarehouseTransfer() {
  const navigate = useNavigate();
  const fromWarehouseIdParam = useQueryParam('fromWarehouseId');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [sourceWarehouseId, setSourceWarehouseId] = useState(fromWarehouseIdParam);
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [partId, setPartId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSourceWarehouseId(fromWarehouseIdParam);
  }, [fromWarehouseIdParam]);

  useEffect(() => {
    setLoading(true);
    Promise.all([getAllWarehouses()])
      .then(([warehouseList]) => setWarehouses(warehouseList || []))
      .catch(() => setWarehouses([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!sourceWarehouseId) {
      setBalances([]);
      setPartId('');
      return;
    }
    getInventoryBalances({ warehouseId: Number(sourceWarehouseId), page: 1, pageSize: 800 })
      .then((res) => {
        setBalances(res.list || []);
        setPartId('');
      })
      .catch(() => setBalances([]));
  }, [sourceWarehouseId]);

  const sourceWarehouse = warehouses.find((warehouse) => String(warehouse.id) === sourceWarehouseId);
  const activeWarehouses = useMemo(() => warehouses.filter((warehouse) => warehouse.status === 'ACTIVE'), [warehouses]);

  const eligibleTargetWarehouses = useMemo(() => {
    if (!sourceWarehouse) return activeWarehouses.filter((w) => w.id !== Number(sourceWarehouseId));

    if (sourceWarehouse.type === 'HQ_WAREHOUSE') {
      return activeWarehouses.filter((w) => w.id !== sourceWarehouse.id && w.type !== 'HQ_WAREHOUSE');
    }

    if (sourceWarehouse.type === 'OUTLET_WAREHOUSE') {
      return activeWarehouses.filter(
        (w) => w.id !== sourceWarehouse.id && w.type === 'ENGINEER_WAREHOUSE' && w.outletId === sourceWarehouse.outletId,
      );
    }

    if (sourceWarehouse.type === 'ENGINEER_WAREHOUSE') {
      return activeWarehouses.filter(
        (w) => w.id !== sourceWarehouse.id && w.type === 'OUTLET_WAREHOUSE' && w.outletId === sourceWarehouse.outletId,
      );
    }

    return activeWarehouses.filter((w) => w.id !== sourceWarehouse.id);
  }, [activeWarehouses, sourceWarehouse, sourceWarehouseId]);

  const partOptions = balances
    .filter((item) => item.quantityAvailable > 0)
    .map((item) => ({
      key: String(item.partId),
      label: `${item.partNo} ${item.partName} (可用 ${item.quantityAvailable})`,
    }));

  const handleSubmit = async () => {
    if (!sourceWarehouseId || !targetWarehouseId || !partId || !quantity) return;
    if (sourceWarehouseId === targetWarehouseId) {
      toast.danger('来源仓库和目标仓库不能相同');
      return;
    }
    setSubmitting(true);
    try {
      await transferInventory({
        fromWarehouseId: Number(sourceWarehouseId),
        toWarehouseId: Number(targetWarehouseId),
        partId: Number(partId),
        quantity: Number(quantity),
      });
      toast.success('调拨成功');
      navigate(-1);
    } catch (err: any) {
      toast.danger(err?.message || '调拨失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingView text="加载调拨页面..." />;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" isIconOnly onPress={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10">
            <ArrowLeftRight className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">调拨管理</h1>
            <p className="text-xs text-[var(--muted)]">总仓 / 网点仓 / 个人仓之间调拨</p>
          </div>
        </div>
      </div>

      <Card className="shadow-[var(--surface-shadow)]">
        <Card.Content className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs text-[var(--muted)]">来源仓库 *</Label>
              <Select value={sourceWarehouseId} onChange={(v) => setSourceWarehouseId(String(v || ''))}>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {activeWarehouses.map((warehouse) => (
                      <ListBox.Item key={String(warehouse.id)} id={String(warehouse.id)} textValue={warehouse.name}>
                        {warehouse.name}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            <div>
              <Label className="mb-1 block text-xs text-[var(--muted)]">目标仓库 *</Label>
              <Select value={targetWarehouseId} onChange={(v) => setTargetWarehouseId(String(v || ''))}>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {eligibleTargetWarehouses.map((warehouse) => (
                      <ListBox.Item key={String(warehouse.id)} id={String(warehouse.id)} textValue={warehouse.name}>
                        {warehouse.name}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block text-xs text-[var(--muted)]">配件 *</Label>
              <Select value={partId} onChange={(v) => setPartId(String(v || ''))}>
                <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                <Select.Popover>
                  <ListBox className="max-h-[240px]">
                    {partOptions.map((part) => (
                      <ListBox.Item key={part.key} id={part.key} textValue={part.label}>
                        {part.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            <TextField value={quantity} onChange={setQuantity}>
              <Label>数量 *</Label>
              <Input type="number" placeholder="请输入数量" />
            </TextField>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-sm">
            <div className="text-[var(--muted)]">
              当前来源仓库：<span className="font-medium text-[var(--foreground)]">{sourceWarehouse?.name || '未选择'}</span>
            </div>
            <Chip size="sm" color="accent">
              {partOptions.length} 个可调拨 SKU
            </Chip>
          </div>
        </Card.Content>
      </Card>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        onPress={handleSubmit}
        isDisabled={submitting || !sourceWarehouseId || !targetWarehouseId || !partId || !quantity}
      >
        {submitting ? '调拨中...' : '确认调拨'}
      </Button>
    </div>
  );
}
