import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Chip, Button, SearchField, Label, Select, ListBox, TextField, Input, Modal } from '@heroui/react';
import { Truck, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Search, Inbox } from 'lucide-react';
import type { Machine, Customer } from '@kinho/shared-types';
import { MACHINE_STATUS_LABELS } from '@kinho/shared-types';
import { getMachines, createMachine, updateMachine, deleteMachine } from '@/services/machine';
import { getAllCustomers } from '@/services/customer';

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger'> = {
  ACTIVE: 'success',
  INACTIVE: 'warning',
  SCRAPPED: 'danger',
};

function getMachineWarranty(machine: Machine): { label: string; color: 'success' | 'danger' | 'default' } {
  const hours = machine.currentHours;
  const startDate = machine.purchaseDate || machine.warrantyStartDate;
  const endDate = machine.warrantyEndDate || machine.warrantyExpiry || (startDate ? addYears(startDate, 1) : null);
  const withinHours = hours != null && Number(hours) <= 3000;
  const withinDate = endDate ? new Date(endDate).getTime() >= Date.now() : false;
  if (withinHours || withinDate) return { label: '三包内', color: 'success' };
  if (hours == null && !endDate) return { label: '未配置', color: 'default' };
  return { label: '三包外', color: 'danger' };
}

function addYears(value: string, years: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString();
}

export default function MachineList() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Machine | null>(null);
  const [form, setForm] = useState({ serialNo: '', model: '', customerId: '', purchaseDate: '', currentHours: '', status: 'ACTIVE' });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    getAllCustomers().then(setCustomers).catch(() => setCustomers([]));
  }, []);

  const fetchData = useCallback(() => {
    getMachines({ keyword, status: statusFilter || undefined, page, pageSize: 20 })
      .then((res) => {
        setMachines(res.list);
        setTotal(res.total);
      })
      .catch(() => {
        setMachines([]);
        setTotal(0);
      });
  }, [keyword, statusFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm({ serialNo: '', model: '', customerId: '', purchaseDate: '', currentHours: '', status: 'ACTIVE' });
    setModalOpen(true);
  };

  const openEdit = (m: Machine) => {
    setEditing(m);
    setForm({ serialNo: m.serialNo, model: m.model, customerId: String(m.customerId), purchaseDate: m.purchaseDate || '', currentHours: m.currentHours != null ? String(m.currentHours) : '', status: m.status });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.serialNo || !form.model || !form.customerId) return;
    const customerId = Number(form.customerId);
    const customer = customers.find((c) => c.id === customerId);
    const payload = {
      serialNo: form.serialNo,
      model: form.model,
      customerId,
      customerName: customer?.companyName || '',
      purchaseDate: form.purchaseDate || null,
      currentHours: form.currentHours ? Number(form.currentHours) : null,
      status: form.status as Machine['status'],
    };
    if (editing) {
      await updateMachine(editing.id, payload);
    } else {
      await createMachine(payload);
    }
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    await deleteMachine(id);
    setDeleteId(null);
    fetchData();
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10">
          <Truck className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">机台管理</h1>
          <p className="text-xs text-[var(--muted)]">管理设备信息、客户归属和状态</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <SearchField
          className="w-64"
          value={keyword}
          onChange={setKeyword}
          aria-label="搜索机台"
        >
          <Label className="sr-only">搜索</Label>
          <SearchField.Group>
            <SearchField.SearchIcon>
              <Search className="h-4 w-4" />
            </SearchField.SearchIcon>
            <SearchField.Input placeholder="搜索设备编号、型号..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <Select
          value={statusFilter}
          onChange={(val) => { setStatusFilter(String(val || '')); setPage(1); }}
          className="w-40"
        >
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item key="" id="" textValue="全部状态">全部状态<ListBox.ItemIndicator /></ListBox.Item>
              <ListBox.Item key="ACTIVE" id="ACTIVE" textValue="在用">在用<ListBox.ItemIndicator /></ListBox.Item>
              <ListBox.Item key="INACTIVE" id="INACTIVE" textValue="停用">停用<ListBox.ItemIndicator /></ListBox.Item>
              <ListBox.Item key="SCRAPPED" id="SCRAPPED" textValue="报废">报废<ListBox.ItemIndicator /></ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
        <div className="ml-auto">
          <Button variant="primary" onPress={openCreate}>
            <Plus className="h-4 w-4" />
            新增机台
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <Card.Content className="p-0">
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="机台列表">
                <Table.Header>
                  <Table.Column isRowHeader>设备编号</Table.Column>
                  <Table.Column isRowHeader>设备型号</Table.Column>
                  <Table.Column isRowHeader>所属客户</Table.Column>
                  <Table.Column isRowHeader>运行时长</Table.Column>
                  <Table.Column isRowHeader>三包状态</Table.Column>
                  <Table.Column isRowHeader>设备状态</Table.Column>
                  <Table.Column isRowHeader>操作</Table.Column>
                </Table.Header>
                <Table.Body
                  items={machines}
                  renderEmptyState={() => (
                    <div className="flex flex-col items-center justify-center py-12 text-[var(--muted)]">
                      <Inbox className="mb-2 h-10 w-10 opacity-40" />
                      <p className="text-sm">暂无机台数据</p>
                    </div>
                  )}
                >
                  {(machine) => (
                    <Table.Row key={machine.id}>
                      <Table.Cell className="font-medium">{machine.serialNo}</Table.Cell>
                      <Table.Cell>{machine.model}</Table.Cell>
                      <Table.Cell>{machine.customerName}</Table.Cell>
                      <Table.Cell>{machine.currentHours != null ? `${machine.currentHours} 小时` : '—'}</Table.Cell>
                      <Table.Cell>
                        <Chip color={getMachineWarranty(machine).color} size="sm">
                          {getMachineWarranty(machine).label}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell>
                        <Chip color={STATUS_COLORS[machine.status] || 'default'} size="sm">
                          {MACHINE_STATUS_LABELS[machine.status]}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onPress={() => openEdit(machine)}>
                            <Edit2 className="h-3.5 w-3.5" />
                            编辑
                          </Button>
                          <Button variant="ghost" size="sm" onPress={() => setDeleteId(machine.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                            删除
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
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-xs transition-colors hover:bg-[var(--surface-secondary)] disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-[var(--accent)] px-2 text-xs font-medium text-[var(--accent-foreground)]">{page}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={machines.length < 20} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-xs transition-colors hover:bg-[var(--surface-secondary)] disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal>
        <Modal.Backdrop isOpen={modalOpen} onOpenChange={(v) => setModalOpen(v)}>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header><Modal.Heading>{editing ? '编辑机台' : '新增机台'}</Modal.Heading></Modal.Header>
              <Modal.Body>
                <div className="space-y-3">
                  <TextField value={form.serialNo} onChange={(val) => setForm({ ...form, serialNo: val })}>
                    <Label>设备编号 *</Label>
                    <Input placeholder="请输入设备编号" />
                  </TextField>
                  <TextField value={form.model} onChange={(val) => setForm({ ...form, model: val })}>
                    <Label>设备型号 *</Label>
                    <Input placeholder="请输入设备型号" />
                  </TextField>
                  <Select
                    value={form.customerId}
                    onChange={(val) => setForm({ ...form, customerId: String(val || '') })}
                    className="w-full"
                  >
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item key="" id="" textValue="请选择客户">请选择客户<ListBox.ItemIndicator /></ListBox.Item>
                        {customers.map((c) => (
                          <ListBox.Item key={String(c.id)} id={String(c.id)} textValue={c.companyName}>{c.companyName}<ListBox.ItemIndicator /></ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  <TextField value={form.purchaseDate} onChange={(val) => setForm({ ...form, purchaseDate: val })}>
                    <Label>客户收货日期</Label>
                    <Input type="date" />
                  </TextField>
                  <TextField value={form.currentHours} onChange={(val) => setForm({ ...form, currentHours: val })}>
                    <Label>当前运行时长</Label>
                    <Input type="number" min={0} placeholder="请输入当前工作小时数" />
                  </TextField>
                  <Select
                    value={form.status}
                    onChange={(val) => setForm({ ...form, status: String(val || '') as Machine['status'] })}
                    className="w-full"
                  >
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item key="ACTIVE" id="ACTIVE" textValue="在用">在用<ListBox.ItemIndicator /></ListBox.Item>
                        <ListBox.Item key="INACTIVE" id="INACTIVE" textValue="停用">停用<ListBox.ItemIndicator /></ListBox.Item>
                        <ListBox.Item key="SCRAPPED" id="SCRAPPED" textValue="报废">报废<ListBox.ItemIndicator /></ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>
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

      {/* Delete Confirmation */}
      <Modal>
        <Modal.Backdrop isOpen={deleteId !== null} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header><Modal.Heading>确认删除</Modal.Heading></Modal.Header>
              <Modal.Body>
                <p className="text-sm text-[var(--muted)]">删除后不可恢复，确定要删除该机台吗？</p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" size="sm" slot="close">取消</Button>
                <Button variant="danger" size="sm" onPress={() => handleDelete(deleteId!)}>确认删除</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
