import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Card, Table, Chip, Button, TextField, Label, Input, Select, ListBox, Modal } from '@heroui/react';
import { Warehouse as WarehouseIcon, Plus, Edit, ToggleLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Warehouse } from '@kinho/shared-types';
import { WAREHOUSE_TYPE_LABELS } from '@kinho/shared-types';
import { usePermissions } from '@kinho/shared-components';
import { getWarehouses, createWarehouse, updateWarehouse, toggleWarehouseStatus } from '@/services/warehouse';

type WarehouseType = Warehouse['type'];

const TYPE_BADGE_COLOR: Record<WarehouseType, 'accent' | 'success' | 'warning'> = {
  HQ_WAREHOUSE: 'accent',
  OUTLET_WAREHOUSE: 'success',
  ENGINEER_WAREHOUSE: 'warning',
};

export default function WarehouseList() {
  const navigate = useNavigate();
  const { has } = usePermissions();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [form, setForm] = useState({
    warehouseNo: '',
    name: '',
    type: 'HQ_WAREHOUSE' as WarehouseType,
    outletId: '',
    outletName: '',
    ownerEngineerId: '',
    ownerEngineerName: '',
    k3WarehouseCode: '',
    status: 'ACTIVE' as Warehouse['status'],
  });
  const fetchData = useCallback(() => {
    getWarehouses({ keyword, type: typeFilter || undefined, page, pageSize: 20 })
      .then((res) => { setWarehouses(res.list); setTotal(res.total); })
      .catch(() => { setWarehouses([]); setTotal(0); });
  }, [keyword, typeFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      warehouseNo: '',
      name: '',
      type: 'HQ_WAREHOUSE',
      outletId: '',
      outletName: '',
      ownerEngineerId: '',
      ownerEngineerName: '',
      k3WarehouseCode: '',
      status: 'ACTIVE',
    });
    setModalOpen(true);
  };

  const openEdit = (w: Warehouse) => {
    setEditing(w);
    setForm({
      warehouseNo: w.warehouseNo,
      name: w.name,
      type: w.type,
      outletId: w.outletId ? String(w.outletId) : '',
      outletName: w.outletName || '',
      ownerEngineerId: w.ownerEngineerId ? String(w.ownerEngineerId) : '',
      ownerEngineerName: w.ownerEngineerName || '',
      k3WarehouseCode: w.k3WarehouseCode || '',
      status: w.status,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.warehouseNo || !form.name) return;

    const base = {
      warehouseNo: form.warehouseNo,
      name: form.name,
      type: form.type,
      status: form.status,
    };

    const typeFields: Partial<Warehouse> = {};
    if (form.type === 'OUTLET_WAREHOUSE') {
      typeFields.outletId = form.outletId ? Number(form.outletId) : undefined;
      typeFields.outletName = form.outletName || undefined;
    } else if (form.type === 'ENGINEER_WAREHOUSE') {
      typeFields.ownerEngineerId = form.ownerEngineerId ? Number(form.ownerEngineerId) : undefined;
      typeFields.ownerEngineerName = form.ownerEngineerName || undefined;
    } else if (form.type === 'HQ_WAREHOUSE') {
      typeFields.k3WarehouseCode = form.k3WarehouseCode || undefined;
    }

    const payload = { ...base, ...typeFields } as Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt'>;

    if (editing) {
      await updateWarehouse(editing.id, payload);
    } else {
      await createWarehouse(payload);
    }
    setModalOpen(false);
    fetchData();
  };

  const handleToggleStatus = async (id: number) => {
    await toggleWarehouseStatus(id);
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div
          className="rounded-xl p-2.5"
          style={{ backgroundColor: 'color-mix(in srgb, var(--success) 12%, transparent)' }}
        >
          <WarehouseIcon className="size-6" style={{ color: 'var(--success)' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">仓库管理</h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">管理仓库信息，维护仓库状态</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <TextField value={keyword} onChange={setKeyword}>
          <Label>搜索</Label>
          <Input placeholder="搜索仓库编号、名称..." />
        </TextField>
        <Select
          value={typeFilter}
          onChange={(val) => { setTypeFilter(String(val || '')); setPage(1); }}
          className="w-40"
        >
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item key="" id="" textValue="全部类型">全部类型<ListBox.ItemIndicator /></ListBox.Item>
              <ListBox.Item key="HQ_WAREHOUSE" id="HQ_WAREHOUSE" textValue="总仓">总仓<ListBox.ItemIndicator /></ListBox.Item>
              <ListBox.Item key="OUTLET_WAREHOUSE" id="OUTLET_WAREHOUSE" textValue="网点仓">网点仓<ListBox.ItemIndicator /></ListBox.Item>
              <ListBox.Item key="ENGINEER_WAREHOUSE" id="ENGINEER_WAREHOUSE" textValue="个人仓">个人仓<ListBox.ItemIndicator /></ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
        <div className="ml-auto flex gap-2">
          {has('warehouse:transfer') && (
            <Button variant="secondary" onPress={() => navigate('/warehouses/transfer')}>
              调拨
            </Button>
          )}
          <Button variant="primary" onPress={openCreate}>
            <Plus className="size-4" />
            新增仓库
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <Card.Content className="p-0">
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="仓库列表">
                <Table.Header>
                  <Table.Column isRowHeader>仓库编号</Table.Column>
                  <Table.Column isRowHeader>名称</Table.Column>
                  <Table.Column isRowHeader>类型</Table.Column>
                  <Table.Column isRowHeader>网点/工程师</Table.Column>
                  <Table.Column isRowHeader>K3编码</Table.Column>
                  <Table.Column isRowHeader>状态</Table.Column>
                  <Table.Column isRowHeader>操作</Table.Column>
                </Table.Header>
                <Table.Body items={warehouses}>
                  {(warehouse) => (
                    <Table.Row key={warehouse.id} className="cursor-pointer" onAction={() => navigate(`/warehouses/${warehouse.id}`)}>
                      <Table.Cell className="font-medium">{warehouse.warehouseNo}</Table.Cell>
                      <Table.Cell>{warehouse.name}</Table.Cell>
                      <Table.Cell>
                        <Chip color={TYPE_BADGE_COLOR[warehouse.type]} variant="primary" size="sm">
                          {WAREHOUSE_TYPE_LABELS[warehouse.type]}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell>
                        {warehouse.type === 'OUTLET_WAREHOUSE' && warehouse.outletName}
                        {warehouse.type === 'ENGINEER_WAREHOUSE' && warehouse.ownerEngineerName}
                      </Table.Cell>
                      <Table.Cell>{warehouse.k3WarehouseCode || '-'}</Table.Cell>
                      <Table.Cell>
                        <Chip color={warehouse.status === 'ACTIVE' ? 'success' : 'default'} variant="primary" size="sm">
                          {warehouse.status === 'ACTIVE' ? '启用' : '禁用'}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onPress={() => navigate(`/warehouses/${warehouse.id}`)}>查看</Button>
                          {has('warehouse:transfer') && (
                            <Button variant="ghost" size="sm" onPress={() => navigate(`/warehouses/transfer?fromWarehouseId=${warehouse.id}`)}>
                              调拨
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onPress={() => openEdit(warehouse)}>
                            <Edit className="size-4" />
                            编辑
                          </Button>
                          <Button variant="ghost" size="sm" onPress={() => handleToggleStatus(warehouse.id)}>
                            <ToggleLeft className="size-4" />
                            {warehouse.status === 'ACTIVE' ? '禁用' : '启用'}
                          </Button>
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </Card.Content>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-[var(--muted)]">
        <span>共 {total} 条</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded border border-[var(--border)] p-1.5 disabled:opacity-50 hover:bg-[var(--surface-secondary)] transition-colors">
            <ChevronLeft className="size-4" />
          </button>
          <span className="rounded bg-[var(--accent)] px-2.5 py-1 text-xs font-medium text-[var(--accent-foreground)]">{page}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={warehouses.length < 20} className="rounded border border-[var(--border)] p-1.5 disabled:opacity-50 hover:bg-[var(--surface-secondary)] transition-colors">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal>
        <Modal.Backdrop isOpen={modalOpen} onOpenChange={(v) => setModalOpen(v)}>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header><Modal.Heading>{editing ? '编辑仓库' : '新增仓库'}</Modal.Heading></Modal.Header>
              <Modal.Body>
                <div className="grid grid-cols-2 gap-3">
                  <TextField value={form.warehouseNo} onChange={(val) => setForm({ ...form, warehouseNo: val })}>
                    <Label>仓库编号 *</Label>
                    <Input />
                  </TextField>
                  <TextField value={form.name} onChange={(val) => setForm({ ...form, name: val })}>
                    <Label>名称 *</Label>
                    <Input />
                  </TextField>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium">类型 *</label>
                    <Select
                      value={form.type}
                      onChange={(val) => setForm({ ...form, type: String(val || '') as WarehouseType })}
                      className="w-full"
                    >
                      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item key="HQ_WAREHOUSE" id="HQ_WAREHOUSE" textValue="总仓">总仓<ListBox.ItemIndicator /></ListBox.Item>
                          <ListBox.Item key="OUTLET_WAREHOUSE" id="OUTLET_WAREHOUSE" textValue="网点仓">网点仓<ListBox.ItemIndicator /></ListBox.Item>
                          <ListBox.Item key="ENGINEER_WAREHOUSE" id="ENGINEER_WAREHOUSE" textValue="个人仓">个人仓<ListBox.ItemIndicator /></ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  {form.type === 'OUTLET_WAREHOUSE' && (
                    <>
                      <TextField value={form.outletId} onChange={(val) => setForm({ ...form, outletId: val })}>
                        <Label>网点ID</Label>
                        <Input type="number" />
                      </TextField>
                      <TextField value={form.outletName} onChange={(val) => setForm({ ...form, outletName: val })}>
                        <Label>网点名称</Label>
                        <Input />
                      </TextField>
                    </>
                  )}

                  {form.type === 'ENGINEER_WAREHOUSE' && (
                    <>
                      <TextField value={form.ownerEngineerId} onChange={(val) => setForm({ ...form, ownerEngineerId: val })}>
                        <Label>工程师ID</Label>
                        <Input type="number" />
                      </TextField>
                      <TextField value={form.ownerEngineerName} onChange={(val) => setForm({ ...form, ownerEngineerName: val })}>
                        <Label>工程师名称</Label>
                        <Input />
                      </TextField>
                    </>
                  )}

                  {form.type === 'HQ_WAREHOUSE' && (
                    <div className="col-span-2">
                      <TextField value={form.k3WarehouseCode} onChange={(val) => setForm({ ...form, k3WarehouseCode: val })}>
                        <Label>K3仓库编码</Label>
                        <Input />
                      </TextField>
                    </div>
                  )}

                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium">状态</label>
                    <Select
                      value={form.status}
                      onChange={(val) => setForm({ ...form, status: String(val || '') as Warehouse['status'] })}
                      className="w-full"
                    >
                      <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item key="ACTIVE" id="ACTIVE" textValue="启用">启用<ListBox.ItemIndicator /></ListBox.Item>
                          <ListBox.Item key="DISABLED" id="DISABLED" textValue="禁用">禁用<ListBox.ItemIndicator /></ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" size="sm" slot="close">取消</Button>
                <Button variant="primary" size="sm" onPress={handleSave}>保存</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

    </div>
  );
}
