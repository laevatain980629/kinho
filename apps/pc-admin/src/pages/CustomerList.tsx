import { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, SearchField, Label, Select, ListBox, Modal, TextField, Input } from '@heroui/react';
import { Users, Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from '@kinho/shared-components';
import { LoadingView, EmptyView } from '@kinho/shared-components';
import type { Customer, Outlet } from '@kinho/shared-types';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/services/customer';
import { getAllOutlets } from '@/services/outlet';

export default function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [outletFilter, setOutletFilter] = useState('');
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ companyName: '', contactPerson: '', phone: '', address: '', outletId: '' });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDelete = async (id: number) => { setDeleteId(null); await deleteCustomer(id); fetchData(); };

  useEffect(() => { getAllOutlets().then(setOutlets).catch(() => setOutlets([])); }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    getCustomers({ keyword, outletId: outletFilter ? Number(outletFilter) : undefined, page, pageSize: 20 })
      .then((res) => { setCustomers(res.list); setTotal(res.total); })
      .catch(() => { setCustomers([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [keyword, outletFilter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditing(null); setForm({ companyName: '', contactPerson: '', phone: '', address: '', outletId: '' }); setModalOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ companyName: c.name || c.companyName || '', contactPerson: c.contactName || c.contactPerson || '', phone: c.contactPhone || c.phone || '', address: c.address || '', outletId: c.outletId != null ? String(c.outletId) : '' }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.companyName || !form.contactPerson || !form.phone || !form.outletId) return;
    const outletId = Number(form.outletId);
    const outlet = outlets.find((o) => o.id === outletId);
    const payload = { companyName: form.companyName, contactPerson: form.contactPerson, phone: form.phone, address: form.address, outletId, outletName: outlet?.name || '' };
    if (editing) { await updateCustomer(editing.id, payload); toast.success('客户已更新'); }
    else { await createCustomer(payload); toast.success('客户已创建'); }
    setModalOpen(false); fetchData();
  };


  const outletOptions = outlets.map((o) => ({ key: String(o.id), label: o.name }));
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10">
          <Users className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">客户管理</h1>
          <p className="text-xs text-[var(--muted)]">管理客户信息和所属网点</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SearchField value={keyword} onChange={setKeyword} className="w-64" />
        <Select value={outletFilter} onChange={(v) => { setOutletFilter(String(v || '')); setPage(1); }} className="w-40">
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item key="" id="" textValue="全部网点">全部网点<ListBox.ItemIndicator /></ListBox.Item>
              {outletOptions.map((o) => (
                <ListBox.Item key={o.key} id={o.key} textValue={o.label}>{o.label}<ListBox.ItemIndicator /></ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <div className="flex-1" />
        <Button variant="primary" size="sm" onPress={openCreate}><Plus className="size-4" />新增客户</Button>
      </div>

      <Card>
        <Card.Content className="p-0">
          {loading ? <LoadingView skeleton skeletonRows={8} /> : (
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="客户列表">
                  <Table.Header>
                    <Table.Column isRowHeader>公司名称</Table.Column>
                    <Table.Column isRowHeader>联系人</Table.Column>
                    <Table.Column isRowHeader>联系电话</Table.Column>
                    <Table.Column isRowHeader>所属网点</Table.Column>
                    <Table.Column isRowHeader>地址</Table.Column>
                    <Table.Column isRowHeader>{/* 操作 */}</Table.Column>
                  </Table.Header>
                  <Table.Body items={customers} renderEmptyState={() => <EmptyView icon={Users} title="暂无客户数据" />}>
                    {(customer) => (
                      <Table.Row key={customer.id}>
                        <Table.Cell className="font-medium">{customer.companyName}</Table.Cell>
                        <Table.Cell>{customer.contactPerson}</Table.Cell>
                        <Table.Cell>{customer.phone}</Table.Cell>
                        <Table.Cell>{customer.outletName}</Table.Cell>
                        <Table.Cell className="text-[var(--muted)]">{customer.address || '—'}</Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onPress={() => openEdit(customer)}><Edit2 className="size-3.5" />编辑</Button>
                            <Button variant="ghost" size="sm" onPress={() => setDeleteId(customer.id)}><Trash2 className="size-3.5" />删除</Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )}
        </Card.Content>
      </Card>

      {!loading && total > 0 && (
        <div className="flex items-center justify-between text-sm text-[var(--muted)]">
          <span>共 {total} 条</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" isDisabled={page <= 1} onPress={() => setPage(page - 1)}>上一页</Button>
            <span className="rounded bg-[var(--accent)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent-foreground)]">{page}/{totalPages}</span>
            <Button variant="ghost" size="sm" isDisabled={page >= totalPages} onPress={() => setPage(page + 1)}>下一页</Button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal>
        <Modal.Backdrop isOpen={modalOpen} onOpenChange={(open) => { if (!open) setModalOpen(false); }}>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header><Modal.Heading>{editing ? '编辑客户' : '新增客户'}</Modal.Heading></Modal.Header>
              <Modal.Body>
                <div className="space-y-3">
                  <TextField value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })}>
                    <Label>公司名称 *</Label>
                    <Input placeholder="请输入公司名称" />
                  </TextField>
                  <TextField value={form.contactPerson} onChange={(v) => setForm({ ...form, contactPerson: v })}>
                    <Label>联系人 *</Label>
                    <Input placeholder="请输入联系人" />
                  </TextField>
                  <TextField value={form.phone} onChange={(v) => setForm({ ...form, phone: v })}>
                    <Label>联系电话 *</Label>
                    <Input placeholder="请输入联系电话" type="tel" />
                  </TextField>
                  <TextField value={form.address} onChange={(v) => setForm({ ...form, address: v })}>
                    <Label>地址</Label>
                    <Input placeholder="请输入地址" />
                  </TextField>
                  <Select value={form.outletId} onChange={(v) => setForm({ ...form, outletId: String(v || '') })}>
                    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item key="" id="" textValue="请选择网点">请选择网点<ListBox.ItemIndicator /></ListBox.Item>
                        {outletOptions.map((o) => (
                          <ListBox.Item key={o.key} id={o.key} textValue={o.label}>{o.label}<ListBox.ItemIndicator /></ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" size="sm" slot="close">取消</Button>
                <Button variant="primary" size="sm" isDisabled={!form.companyName || !form.contactPerson || !form.phone || !form.outletId} onPress={handleSave}>保存</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>


      <Modal>
        <Modal.Backdrop isOpen={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
          <Modal.Container size="sm"><Modal.Dialog><Modal.CloseTrigger />
            <Modal.Header><Modal.Icon><Trash2 className="size-5 text-[var(--danger)]" /></Modal.Icon><Modal.Heading>确认删除</Modal.Heading></Modal.Header>
            <Modal.Body><p className="text-sm text-[var(--muted)]">删除后不可恢复，确定要删除该客户吗？</p></Modal.Body>
            <Modal.Footer><Button variant="secondary" size="sm" slot="close">取消</Button><Button variant="danger" size="sm" onPress={() => handleDelete(deleteId!)}>确认删除</Button></Modal.Footer>
          </Modal.Dialog></Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
